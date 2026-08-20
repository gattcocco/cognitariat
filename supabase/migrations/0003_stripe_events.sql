-- Idempotenza webhook Stripe: Stripe non garantisce consegna singola né ordinata degli
-- eventi. Il webhook inserisce event_id qui PRIMA di applicare qualunque aggiornamento;
-- un conflitto (evento già visto) fa terminare la richiesta con 200 senza rifare nulla.

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- Nessuna policy: tabella tecnica, mai letta/scritta dal client. Solo il service role
-- (che bypassa RLS) vi accede, dal webhook.
