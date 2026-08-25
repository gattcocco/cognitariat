-- Stato della quota associativa 2026 — pagamento ONE-OFF, non abbonamento (Build 1.0,
-- vedi piano v3): niente stripe_subscription_id, niente ciclo di fatturazione. Sola
-- lettura per il client (RLS + GRANT limitato a select): nessun privilegio insert/update
-- per il ruolo authenticated, a nessuna colonna. Scrive solo il webhook Stripe tramite
-- service role key (che bypassa RLS).

create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text check (tier in ('studente', 'cognitario')),
  status text not null default 'pending'
    check (status in ('pending', 'payment_pending', 'active', 'payment_failed')),
  amount_paid_cents integer,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  valid_until date,
  updated_at timestamptz not null default now()
);

alter table public.memberships enable row level security;

create policy "memberships_select_own" on public.memberships
  for select
  using (auth.uid() = user_id);

grant select on public.memberships to authenticated;
-- Nessun grant insert/update/delete a authenticated: di proposito.
