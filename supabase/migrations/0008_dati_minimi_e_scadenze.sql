-- =============================================================================
-- 0008 — Meno dati, e ognuno con una scadenza che si applica da sola.
--
-- NON APPLICATA AUTOMATICAMENTE, come la 0007: va eseguita a mano sul progetto
-- Supabase quando si riaprono le iscrizioni, DOPO la 0007. Fino ad allora il
-- database remoto non esiste in questa forma e non cambia niente.
--
-- Scritta il 21/09/2026 insieme all'informativa v6 e alle condizioni di
-- pagamento. Il principio chiesto dal committente: chiedere meno dati possibile
-- e tenerli il meno possibile. Ogni termine scritto su /privacy deve essere
-- applicato da qui, non affidato alla memoria di qualcuno: un termine pubblicato
-- e non rispettato e' peggio di nessun termine.
--
-- -----------------------------------------------------------------------------
-- 1. IL CODICE FISCALE ESCE
-- -----------------------------------------------------------------------------
-- Era facoltativo "in attesa di una verifica con la contabilita'". Non serve a
-- niente di quello che facciamo: la quota associativa non richiede fattura, la
-- ricevuta la manda Stripe, e un sindacato non rilascia ricevute per detrazioni.
-- Un dato che non serve non si chiede, e soprattutto non si conserva: il codice
-- fiscale identifica una persona in modo univoco e permanente, e accanto
-- all'appartenenza a un sindacato e' esattamente il tipo di dato che non deve
-- stare in un database che potrebbe un giorno perdere qualcosa.
--
-- Il trigger di conferma viene riscritto senza la colonna, poi la colonna si
-- toglie. L'ordine conta: al contrario, la funzione della 0007 fallirebbe alla
-- prima conferma.
--
-- -----------------------------------------------------------------------------
-- 2. LE SCADENZE
-- -----------------------------------------------------------------------------
-- Tre regole, una sola esecuzione giornaliera (03:30 UTC, dopo la pulizia della
-- 0004 alle 03:00):
--
--   a. Account confermati senza nessuna tessera in corso, creati da piu' di 30
--      giorni: si cancellano. E' chi ha cominciato l'iscrizione e non ha pagato,
--      o la cui iscrizione e' stata rifiutata e rimborsata.
--   b. Tessere scadute da piu' di 12 mesi: si cancella l'account, e con lui
--      profilo, tessera e prova del consenso (on delete cascade). I 12 mesi
--      servono a rinnovare senza rifare tutto e a poter dimostrare chi era
--      iscritto quando si e' votato in assemblea.
--   c. Eventi Stripe gia' elaborati da piu' di 90 giorni: si cancellano. Sono
--      identificativi tecnici per non elaborare due volte lo stesso evento;
--      dopo tre mesi Stripe non li rimanda piu'.
--
-- Una tessera 'payment_pending' (addebito SEPA in attesa) non viene toccata
-- dalla regola a: l'esito arriva da Stripe entro pochi giorni. Se restasse
-- bloccata cosi' a lungo sarebbe un difetto da guardare, non un dato da buttare
-- in silenzio.
--
-- Quello che NON e' qui, di proposito: i documenti contabili. Se il
-- commercialista stabilisce che l'associazione deve tenere un elenco nominativo
-- delle quote incassate per un certo numero di anni, quell'elenco si tiene fuori
-- da questo database, con solo nome, anno e importo. Vedi docs/conservazione-dati.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger di conferma senza codice fiscale
-- -----------------------------------------------------------------------------
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  versione_dichiarata text;
  consenso_dichiarato boolean;
begin
  if old.email_confirmed_at is not null or new.email_confirmed_at is null then
    return new;
  end if;

  -- Nome e cognome, e basta. Qualunque altro campo mandato nei metadata viene
  -- ignorato: un dato non previsto qui non arriva al profilo.
  insert into public.member_profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;

  versione_dichiarata := nullif(new.raw_user_meta_data ->> 'privacy_version', '');
  consenso_dichiarato := coalesce((new.raw_user_meta_data ->> 'privacy_accepted')::boolean, false);

  if versione_dichiarata is null or consenso_dichiarato is not true then
    raise log '[privacy] utente % confermato senza dichiarazione di consenso: nessuna accettazione registrata', new.id;
    return new;
  end if;

  if not exists (select 1 from public.privacy_versions v where v.version = versione_dichiarata) then
    raise log '[privacy] utente %: versione informativa sconosciuta (%), nessuna accettazione registrata',
      new.id, versione_dichiarata;
    return new;
  end if;

  insert into public.privacy_acceptances (user_id, version)
  values (new.id, versione_dichiarata);

  return new;
end;
$$;

alter table public.member_profiles drop column if exists codice_fiscale;

-- -----------------------------------------------------------------------------
-- 2. La versione dell'informativa che accompagna questa migration
-- -----------------------------------------------------------------------------
insert into public.privacy_versions (version, pubblicata_il, note) values
  ('v6-2026-09-21', '2026-09-21', 'Tesseramento e pagamenti descritti prima dell''apertura: dati minimi (nome, cognome, email), niente codice fiscale, scadenze applicate dal database, Stripe come fornitore dei pagamenti. Nuova pagina Condizioni e rimborsi.')
on conflict (version) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Scadenze, applicate ogni giorno
-- -----------------------------------------------------------------------------
-- pg_cron si installa nello schema pg_catalog: il suo file di controllo lo
-- impone, e su Supabase "with schema extensions" fallisce con "extension
-- pg_cron must be installed in schema pg_catalog". Corretto il 21/09/2026,
-- prima della prima esecuzione. Se il Cron e' gia' stato attivato dal pannello
-- (Integrations -> Cron), questa riga non fa niente.
create extension if not exists pg_cron with schema pg_catalog;

select
  cron.schedule(
    'scadenze-dati-iscritti',
    '30 3 * * *', -- ogni giorno alle 03:30 UTC
    $$
      -- a. account senza tessera in corso, piu' vecchi di 30 giorni
      delete from auth.users u
      where u.email_confirmed_at is not null
        and u.created_at < now() - interval '30 days'
        and not exists (
          select 1 from public.memberships m
          where m.user_id = u.id
            and m.status in ('active', 'payment_pending')
        );

      -- b. tessere scadute da piu' di 12 mesi
      delete from auth.users u
      using public.memberships m
      where m.user_id = u.id
        and m.status = 'active'
        and m.valid_until < current_date - interval '12 months';

      -- c. eventi Stripe elaborati da piu' di 90 giorni
      delete from public.stripe_events
      where created_at < now() - interval '90 days';
    $$
  )
where not exists (
  select 1 from cron.job where jobname = 'scadenze-dati-iscritti'
);
