-- Profilo del membro: nome e consenso privacy. Nessun dato di membership/billing qui
-- (vedi 0002_memberships.sql) — separazione voluta per rendere il confine di sicurezza
-- strutturale (RLS + GRANT a livello di tabella) invece che affidato a GRANT per colonna.

create table if not exists public.member_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  consent_privacy_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now()
);

alter table public.member_profiles enable row level security;

create policy "member_profiles_select_own" on public.member_profiles
  for select
  using (auth.uid() = id);

create policy "member_profiles_update_own" on public.member_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, update on public.member_profiles to authenticated;

-- Crea il profilo SOLO quando l'email viene confermata (click sul magic link), non
-- all'insert immediato di auth.users: signInWithOtp() su un indirizzo nuovo crea la riga
-- auth.users subito, ma la persona potrebbe non cliccare mai il link. full_name/
-- consent_version/consent_privacy_at arrivano da options.data passato al signup (vedi
-- src/components/MembershipSignup.astro) e restano in raw_user_meta_data fino a qui.
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into public.member_profiles (id, full_name, consent_privacy_at, consent_version)
    values (
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      coalesce((new.raw_user_meta_data ->> 'privacy_seen_at')::timestamptz, now()),
      new.raw_user_meta_data ->> 'privacy_version'
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();
