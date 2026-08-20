-- Idempotenza webhook Stripe: Stripe non garantisce consegna singola né ordinata degli
-- eventi. Il webhook fa upsert di event_id con status='processing' PRIMA di applicare
-- l'aggiornamento, e lo porta a 'processed' SOLO se l'intero handler completa senza
-- errori. Un evento già 'processed' fa terminare il retry con 200 senza rifare nulla; un
-- evento rimasto 'processing' o 'failed' (scrittura Supabase caduta a metà) viene invece
-- rielaborato al prossimo retry — mai marcato "visto" prima di essere davvero applicato.

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_events enable row level security;
-- Nessuna policy: tabella tecnica, mai letta/scritta dal client. Solo il service role
-- (che bypassa RLS) vi accede, dal webhook.
