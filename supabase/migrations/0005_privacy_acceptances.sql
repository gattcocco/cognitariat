-- Prova di accettazione dell'informativa privacy: append-only, MAI modificabile dal
-- client (nessun grant insert/update/delete ad authenticated). Sia il timestamp
-- (accepted_at, orologio del database) sia la versione (hardcoded qui sotto, non letta da
-- raw_user_meta_data) sono determinati lato server — un client non può alterare cosa e
-- quando ha "accettato". Se in futuro cambia src/lib/consent.ts (PRIVACY_POLICY_VERSION),
-- questa costante va aggiornata in una nuova migration, non modificando questo file.

create table if not exists public.privacy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now()
);

alter table public.privacy_acceptances enable row level security;

create policy "privacy_acceptances_select_own" on public.privacy_acceptances
  for select
  using (auth.uid() = user_id);

grant select on public.privacy_acceptances to authenticated;
-- Nessun grant insert/update/delete: scritta solo dal trigger (security definer) sotto.

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  current_privacy_version constant text := 'v1-2026-08-20'; -- tenere allineato a src/lib/consent.ts
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into public.member_profiles (id, full_name)
    values (new.id, new.raw_user_meta_data ->> 'full_name')
    on conflict (id) do nothing;

    insert into public.privacy_acceptances (user_id, version)
    values (new.id, current_privacy_version);
  end if;
  return new;
end;
$$;
