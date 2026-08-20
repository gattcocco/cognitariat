-- Stato di iscrizione/fatturazione. Sola lettura per il client (RLS + GRANT limitato a
-- select): nessun privilegio insert/update per il ruolo authenticated, a nessuna colonna.
-- Scrive solo il webhook Stripe tramite service role key (che bypassa RLS).

create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text check (tier in ('solidarieta', 'precaria', 'stabile')),
  status text not null default 'pending'
    check (status in ('pending', 'payment_pending', 'active', 'past_due', 'canceled', 'expired')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end date,
  updated_at timestamptz not null default now()
);

alter table public.memberships enable row level security;

create policy "memberships_select_own" on public.memberships
  for select
  using (auth.uid() = user_id);

grant select on public.memberships to authenticated;
-- Nessun grant insert/update/delete a authenticated: di proposito.
