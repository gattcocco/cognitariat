-- Profilo del membro: nome, cognome e codice fiscale (opzionale). La prova di
-- accettazione dell'informativa privacy vive altrove (privacy_acceptances, vedi 0005):
-- non va mai messa in una tabella con UPDATE concesso al client, altrimenti l'utente
-- potrebbe riscrivere la propria "prova" di consenso a posteriori.
--
-- Nessun dato di membership/pagamento qui (vedi 0002_memberships.sql) — separazione
-- voluta per rendere il confine di sicurezza strutturale (RLS + GRANT a livello di
-- tabella) invece che affidato a GRANT per colonna.
--
-- codice_fiscale è opzionale "per ora" (Build 1.0, in attesa di conferma contabile sulla
-- sua necessità) e NON va mai inviato a Stripe — vedi commento in functions/api/checkout.ts.

create table if not exists public.member_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  codice_fiscale text,
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
-- auth.users subito, ma la persona potrebbe non cliccare mai il link. first_name/
-- last_name/codice_fiscale arrivano da options.data passato al signup (vedi
-- src/components/MembershipSignup.astro) e restano in raw_user_meta_data fino a qui —
-- dati non finanziari, va bene fidarsi del client per questi.
--
-- Le colonne restano NULLABLE anche se il form li richiede lato client: un vincolo NOT
-- NULL qui romperebbe l'intera conferma email (questo trigger gira su un UPDATE di
-- auth.users) se mai arrivasse un metadata incompleto.
--
-- La funzione viene estesa in 0005_privacy_acceptances.sql per scrivere anche lì.
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into public.member_profiles (id, first_name, last_name, codice_fiscale)
    values (
      new.id,
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      nullif(new.raw_user_meta_data ->> 'codice_fiscale', '')
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
