-- Prenotazione atomica del checkout: garantisce UNA SOLA Checkout Session aperta per
-- utente per la quota 2026.
--
-- Il controllo "hai già una quota attiva?" fatto con SELECT seguito da UPDATE dal codice
-- applicativo non basta: due richieste concorrenti (doppio click, retry di rete, due tab)
-- possono entrambe leggere lo stesso stato e creare due sessioni Stripe distinte. Qui la
-- decisione è presa dentro una singola transazione, con la riga bloccata da FOR UPDATE.
--
-- L'identità della prenotazione è checkout_claim_token (uuid), non un timestamp:
--   * per sapere se è stata questa chiamata a creare la riga si usa FOUND dopo la INSERT,
--     non un confronto su now() (due transazioni possono avere lo stesso now() e, peggio,
--     il confronto non dice nulla su *chi* ha scritto);
--   * per SOSTITUIRE una prenotazione esistente il chiamante deve presentare il token che
--     ha appena verificato su Stripe (compare-and-swap). Se nel frattempo un'altra
--     richiesta ha già rinnovato, il token non combacia più e la seconda richiesta viene
--     rimandata alla prenotazione nuova invece di crearne una propria.
--
-- Esiti (outcome):
--   claimed      prenotazione vinta: il chiamante crea una nuova Checkout Session
--   reuse        esiste già una prenotazione viva: il chiamante verifica su Stripe lo
--                stato reale della sessione e decide (riusarla, oppure ripresentarsi qui
--                con claim_token per sostituirla)
--   in_progress  un'altra richiesta ha prenotato pochi istanti fa e sta creando la sessione
--   blocked      stato non compatibile con un nuovo checkout (active/payment_pending/rejected)

create or replace function public.claim_membership_checkout(
  p_user_id uuid,
  p_tier text,
  p_expected_claim_token uuid default null
)
returns table (
  outcome text,
  session_id text,
  current_status text,
  current_tier text,
  claim_token uuid
)
language plpgsql
security definer set search_path = public
as $$
declare
  -- DELIBERATAMENTE PIÙ LUNGO del TTL della sessione Stripe (30 min, vedi
  -- SESSION_TTL_SECONDS in functions/api/checkout.ts): la prenotazione viene creata
  -- *prima* della sessione, quindi un lease uguale scadrebbe qualche istante prima della
  -- sessione, aprendo una finestra in cui una sessione ancora pagabile risulta libera e
  -- se ne può creare una seconda. Il margine garantisce l'ordine opposto: la sessione
  -- Stripe scade sempre per prima, e il rinnovo avviene solo dopo che il chiamante ha
  -- verificato su Stripe che la sessione non è più aperta.
  v_session_lease interval := interval '35 minutes';
  -- Finestra breve per una prenotazione che non ha ancora una sessione salvata: creare
  -- una sessione Stripe richiede secondi, non minuti. Oltre questa soglia la richiesta
  -- che aveva prenotato è considerata morta (crash/timeout) e la prenotazione è riusabile,
  -- senza dover aspettare il lease lungo.
  v_pending_grace interval := interval '2 minutes';
  v_row public.memberships%rowtype;
  v_now timestamptz := now();
  v_new_token uuid := gen_random_uuid();
begin
  insert into public.memberships (user_id, tier, status, checkout_claim_token, checkout_claimed_at)
  values (p_user_id, p_tier, 'pending', v_new_token, v_now)
  on conflict (user_id) do nothing;

  -- FOUND è true solo se la INSERT ha davvero inserito: è questa chiamata ad aver creato
  -- la riga, quindi la prenotazione è sua senza ambiguità.
  if found then
    return query select 'claimed'::text, null::text, 'pending'::text, p_tier, v_new_token;
    return;
  end if;

  select * into v_row from public.memberships where user_id = p_user_id for update;

  if v_row.status in ('active', 'payment_pending', 'rejected') then
    return query
      select 'blocked'::text, v_row.stripe_checkout_session_id, v_row.status, v_row.tier, v_row.checkout_claim_token;
    return;
  end if;

  -- Da qui lo stato è 'pending' o 'payment_failed'.
  if v_row.status = 'pending'
     and v_row.checkout_claim_token is not null
     and v_row.checkout_claimed_at is not null
  then
    -- Compare-and-swap: solo chi presenta il token della prenotazione che ha appena
    -- verificato può sostituirla. Due richieste che vedono la stessa sessione scaduta
    -- presentano lo stesso token, ma FOR UPDATE le serializza: la prima rinnova (il token
    -- cambia), la seconda non combacia più e prosegue nei rami sotto, finendo sulla
    -- prenotazione nuova invece di crearne una seconda.
    if p_expected_claim_token is not null and p_expected_claim_token = v_row.checkout_claim_token then
      update public.memberships
      set tier = p_tier,
          status = 'pending',
          stripe_checkout_session_id = null,
          checkout_claim_token = v_new_token,
          checkout_claimed_at = v_now,
          updated_at = v_now
      where user_id = p_user_id;

      return query select 'claimed'::text, null::text, 'pending'::text, p_tier, v_new_token;
      return;
    end if;

    if v_row.stripe_checkout_session_id is not null then
      if v_row.checkout_claimed_at > v_now - v_session_lease then
        -- Prenotazione viva con una sessione: il chiamante ne verifica lo stato reale su
        -- Stripe. Riceve anche current_tier, perché una sessione aperta per un'altra
        -- fascia non va riusata (importo sbagliato).
        return query
          select 'reuse'::text, v_row.stripe_checkout_session_id, v_row.status, v_row.tier, v_row.checkout_claim_token;
        return;
      end if;
      -- Lease scaduto del tutto: la sessione Stripe è scaduta da un pezzo (TTL più corto).
    else
      if v_row.checkout_claimed_at > v_now - v_pending_grace then
        return query select 'in_progress'::text, null::text, v_row.status, v_row.tier, v_row.checkout_claim_token;
        return;
      end if;
      -- Prenotazione senza sessione oltre la grace window: richiesta morta a metà.
    end if;
  end if;

  -- Prenotazione scaduta, oppure stato 'payment_failed' (ritentativo legittimo).
  update public.memberships
  set tier = p_tier,
      status = 'pending',
      stripe_checkout_session_id = null,
      checkout_claim_token = v_new_token,
      checkout_claimed_at = v_now,
      updated_at = v_now
  where user_id = p_user_id;

  return query select 'claimed'::text, null::text, 'pending'::text, p_tier, v_new_token;
end;
$$;

-- Solo il service role (dalle Pages Functions) può chiamarla: mai il client.
-- L'EXECUTE su una funzione è concesso a PUBLIC per default: la revoca qui sotto lo
-- toglie anche a service_role (che lo eredita da PUBLIC), quindi va ri-concesso
-- esplicitamente — senza questo grant il checkout fallirebbe con "permission denied".
revoke all on function public.claim_membership_checkout(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_membership_checkout(uuid, text, uuid) to service_role;
