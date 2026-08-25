-- Stato della quota associativa 2026 — pagamento ONE-OFF, non abbonamento (Build 1.0,
-- vedi piano v3): niente stripe_subscription_id, niente ciclo di fatturazione. Sola
-- lettura per il client (RLS + GRANT limitato a select): nessun privilegio insert/update
-- per il ruolo authenticated, a nessuna colonna. Scrive solo il webhook Stripe tramite
-- service role key (che bypassa RLS).
--
-- Stati:
--   pending          quota scelta, checkout avviato ma non ancora pagato
--   payment_pending  pagamento avviato con metodo asincrono (SEPA), non ancora incassato
--   active           quota incassata: iscrizione valida
--   payment_failed   pagamento asincrono non andato a buon fine
--   rejected         iscrizione non accettata dal direttivo dopo il pagamento (vedi sotto)
--
-- checkout_claim_token / checkout_claimed_at identificano l'ultima "prenotazione" di un
-- checkout: servono a garantire che esista UNA SOLA Checkout Session aperta per utente
-- (vedi la funzione claim_membership_checkout in 0006). Il token è l'identità della
-- prenotazione: chi vuole sostituirne una deve presentare il token che ha verificato,
-- così due richieste concorrenti non possono rinnovare entrambe (compare-and-swap).

create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text check (tier in ('studente', 'cognitario')),
  status text not null default 'pending'
    check (status in ('pending', 'payment_pending', 'active', 'payment_failed', 'rejected')),
  amount_paid_cents integer,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  checkout_claim_token uuid,
  checkout_claimed_at timestamptz,
  valid_until date,
  updated_at timestamptz not null default now()
);

alter table public.memberships enable row level security;

create policy "memberships_select_own" on public.memberships
  for select
  using (auth.uid() = user_id);

grant select on public.memberships to authenticated;
-- Nessun grant insert/update/delete a authenticated: di proposito.

-- ---------------------------------------------------------------------------
-- PROCEDURA MANUALE — mancata accettazione dal direttivo (v1, nessun pannello admin)
--
-- Il pagamento vale come iscrizione immediata; se il direttivo NON accetta l'iscrizione,
-- la procedura è: prima si rimborsa su Stripe, poi si marca la membership come rejected.
-- L'ordine conta: rimborsare per primo evita di lasciare una persona non iscritta con la
-- quota trattenuta.
--
--   1. Stripe Dashboard → Payments → trova il pagamento (cerca per email o per l'id in
--      memberships.stripe_checkout_session_id) → Refund, importo pieno.
--   2. Poi, sul database (SQL Editor di Supabase):
--
--        update public.memberships
--        set status = 'rejected',
--            valid_until = null,
--            updated_at = now()
--        where user_id = '<uuid della persona>';
--
-- Una membership 'rejected' non può avviare un nuovo checkout (vedi 0006): la persona va
-- ricontattata fuori piattaforma. Il webhook Stripe non riporta mai 'rejected' ad
-- 'active' da solo (vedi la guardia in functions/webhooks/stripe.ts).
-- ---------------------------------------------------------------------------
