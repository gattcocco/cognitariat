-- signInWithOtp() su un indirizzo nuovo crea subito una riga in auth.users, prima che la
-- persona clicchi il magic link. member_profiles viene creato solo alla conferma (vedi
-- 0001_member_profiles.sql), quindi gli utenti mai confermati non hanno righe correlate:
-- il cleanup qui sotto è sicuro e non lascia dati orfani.
--
-- Richiede l'estensione pg_cron abilitata sul progetto (Database → Extensions, o la riga
-- sotto se il progetto lo consente da migration).
-- pg_cron si installa nello schema pg_catalog: il suo file di controllo lo
-- impone, e su Supabase "with schema extensions" fallisce con "extension
-- pg_cron must be installed in schema pg_catalog". Corretto il 21/09/2026,
-- prima della prima esecuzione. Se il Cron e' gia' stato attivato dal pannello
-- (Integrations -> Cron), questa riga non fa niente.
create extension if not exists pg_cron with schema pg_catalog;

select
  cron.schedule(
    'cleanup-unconfirmed-users',
    '0 3 * * *', -- ogni giorno alle 03:00 UTC
    $$
      delete from auth.users
      where email_confirmed_at is null
        and created_at < now() - interval '48 hours'
    $$
  )
where not exists (
  select 1 from cron.job where jobname = 'cleanup-unconfirmed-users'
);
