-- Prenotazione atomica del checkout: garantisce UNA SOLA Checkout Session aperta per
-- utente per la quota 2026.
--
-- Il controllo "hai già una quota attiva?" fatto con SELECT seguito da UPDATE dal codice
-- applicativo non basta: due richieste concorrenti (doppio click, retry di rete, due tab)
-- possono entrambe leggere lo stesso stato e creare due sessioni Stripe distinte. Qui la
-- decisione è presa dentro una singola transazione, con la riga bloccata da FOR UPDATE,
-- quindi solo una delle due richieste può vincere.
--
-- Esiti possibili (outcome):
--   claimed      prenotazione riuscita: il chiamante può creare una nuova Checkout Session
--   reuse        c'è già una sessione aperta per questa fascia: riusare quella, non crearne
--                un'altra (il chiamante verifica su Stripe che sia ancora 'open')
--   in_progress  un'altra richiesta ha prenotato pochi istanti fa e sta creando la sessione
--   blocked      stato non compatibile con un nuovo checkout (active/payment_pending/rejected)

create or replace function public.claim_membership_checkout(
  p_user_id uuid,
  p_tier text,
  p_force boolean default false
)
returns table (outcome text, session_id text, current_status text, claimed_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  -- Allineato all'expires_at della sessione Stripe (30 min, il minimo consentito da
  -- Stripe): oltre questa soglia la sessione è comunque scaduta e la prenotazione può
  -- essere riassegnata senza rischio di doppio pagamento.
  v_lease interval := interval '30 minutes';
  v_row public.memberships%rowtype;
  v_now timestamptz := now();
begin
  -- Crea la riga se manca. on conflict do nothing rende l'operazione sicura anche se due
  -- richieste arrivano insieme su un utente senza riga: una sola inserisce, l'altra
  -- prosegue e trova la riga esistente al SELECT ... FOR UPDATE qui sotto.
  insert into public.memberships (user_id, tier, status, checkout_claimed_at)
  values (p_user_id, p_tier, 'pending', v_now)
  on conflict (user_id) do nothing;

  select * into v_row from public.memberships where user_id = p_user_id for update;

  -- Riga appena creata da questa stessa chiamata: prenotazione vinta.
  if v_row.checkout_claimed_at = v_now and v_row.status = 'pending' then
    return query select 'claimed'::text, null::text, v_row.status, v_row.checkout_claimed_at;
    return;
  end if;

  if v_row.status in ('active', 'payment_pending', 'rejected') then
    return query select 'blocked'::text, null::text, v_row.status, v_row.checkout_claimed_at;
    return;
  end if;

  -- Da qui: status è 'pending' o 'payment_failed'.
  if not p_force
     and v_row.status = 'pending'
     and v_row.checkout_claimed_at is not null
     and v_row.checkout_claimed_at > v_now - v_lease
  then
    if v_row.stripe_checkout_session_id is not null and v_row.tier = p_tier then
      -- Sessione già creata e ancora nel periodo di validità: si riusa quella.
      return query select 'reuse'::text, v_row.stripe_checkout_session_id, v_row.status, v_row.checkout_claimed_at;
      return;
    end if;

    if v_row.stripe_checkout_session_id is null then
      -- Prenotazione fresca ma nessuna sessione ancora salvata: un'altra richiesta è a
      -- metà strada. Non se ne crea una seconda in parallelo.
      return query select 'in_progress'::text, null::text, v_row.status, v_row.checkout_claimed_at;
      return;
    end if;
    -- Sessione esistente ma per un'altra fascia (la persona ha cambiato idea):
    -- si prosegue con una nuova prenotazione qui sotto.
  end if;

  update public.memberships
  set tier = p_tier,
      status = 'pending',
      stripe_checkout_session_id = null,
      checkout_claimed_at = v_now,
      updated_at = v_now
  where user_id = p_user_id;

  return query select 'claimed'::text, null::text, 'pending'::text, v_now;
end;
$$;

-- Solo il service role (dalle Pages Functions) può chiamarla: mai il client.
-- L'EXECUTE su una funzione è concesso a PUBLIC per default: la revoca qui sotto lo
-- toglie anche a service_role (che lo eredita da PUBLIC), quindi va ri-concesso
-- esplicitamente — senza questo grant il checkout fallirebbe con "permission denied".
revoke all on function public.claim_membership_checkout(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_membership_checkout(uuid, text, boolean) to service_role;
