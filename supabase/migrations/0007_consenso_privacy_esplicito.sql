-- =============================================================================
-- 0007 — Il consenso privacy smette di essere dedotto dalla conferma email,
--        e la versione dell'informativa viene allineata.
--
-- NON APPLICATA AUTOMATICAMENTE. Va eseguita a mano sul progetto Supabase quando
-- si decide di riaprire le registrazioni, insieme al ripristino del modulo di
-- iscrizione. Finche' le registrazioni sono chiuse non cambia niente di visibile:
-- nessuno puo' confermare un'email che nessuno ha chiesto.
--
-- -----------------------------------------------------------------------------
-- IL DIFETTO
-- -----------------------------------------------------------------------------
-- La 0005 faceva scrivere una riga in privacy_acceptances a ogni transizione
-- email_confirmed_at NULL -> non NULL, con una versione fissata nel codice della
-- funzione. Cioe': cliccare un magic link veniva registrato come prova di aver
-- accettato l'informativa.
--
-- Non e' la stessa cosa. Il click prova che quella persona controlla quella
-- casella di posta; non prova che le sia stato mostrato un testo, ne' che lo
-- abbia accettato, ne' quale versione abbia visto. La riga prodotta era una
-- prova di un consenso mai raccolto — il tipo di documento che non serve a
-- nessuno quando conta davvero, perche' e' falsificabile per costruzione.
--
-- Tre modi concreti in cui sbagliava:
--   1. registrava un'accettazione anche per utenti creati per altre vie (invito
--      dall'amministrazione, chiamata diretta all'API Auth), che un modulo di
--      iscrizione non l'hanno mai visto;
--   2. stampava la versione corrente del server, non quella effettivamente
--      mostrata alla persona: se l'informativa cambiava fra la richiesta del
--      link e il click, la prova indicava il testo sbagliato;
--   3. scattava su ogni transizione della conferma, quindi anche su una
--      riconferma successiva o un cambio di indirizzo.
--
-- -----------------------------------------------------------------------------
-- COSA FA QUESTA MIGRATION
-- -----------------------------------------------------------------------------
-- 1. Tiene la creazione del profilo alla conferma email: quella e' corretta.
-- 2. Scrive in privacy_acceptances SOLO se nei metadata di iscrizione c'e' una
--    dichiarazione esplicita di accettazione, con la versione che la persona ha
--    davvero visto.
-- 3. Accetta solo versioni note (whitelist lato server): il client dichiara
--    quale testo ha visto, ma non puo' inventarsi una stringa qualsiasi.
-- 4. Non tocca una sola riga gia' esistente. Le accettazioni storiche restano
--    dove sono: riscriverle sarebbe lo stesso errore, al contrario.
--
-- -----------------------------------------------------------------------------
-- COSA SERVE ANCORA, LATO APPLICAZIONE, PRIMA DI RIAPRIRE
-- -----------------------------------------------------------------------------
-- Questa migration da sola non chiude il punto: rende impossibile fabbricare una
-- prova, non produce una prova vera. Perche' ne esista una serve che il modulo di
-- iscrizione (rimosso in Fase 4, da ricostruire) passi a signInWithOtp():
--
--   options: { data: {
--     first_name, last_name,
--     privacy_version:     '<la versione mostrata nella pagina in quel momento>',
--     privacy_accepted:    true,          // solo se la casella e' stata spuntata
--     privacy_accepted_at: '<ISO 8601>'   // informativo: fa fede accepted_at del DB
--   } }
--
-- e che la casella di consenso sia separata, non pre-spuntata e non implicita
-- nell'invio del modulo. Senza quei campi, qui non viene registrato niente: e'
-- voluto. Meglio nessuna prova che una prova finta.
-- =============================================================================

-- Versioni dell'informativa che il server riconosce. Aggiungerne una qui quando
-- src/lib/consent.ts cambia: e' l'allineamento v1 -> v2 chiesto, fatto in modo che
-- le due versioni convivano invece di sostituirsi. Una prova storica deve poter
-- continuare a dire "ha accettato la v1", che e' quello che e' successo.
create table if not exists public.privacy_versions (
  version text primary key,
  pubblicata_il date not null,
  note text
);

alter table public.privacy_versions enable row level security;
-- Sola lettura per chi e' autenticato: serve a mostrare in area membro quale
-- testo si e' accettato. Nessuna scrittura dal client.
drop policy if exists "privacy_versions_select" on public.privacy_versions;
create policy "privacy_versions_select" on public.privacy_versions
  for select
  using (true);
grant select on public.privacy_versions to authenticated, anon;

insert into public.privacy_versions (version, pubblicata_il, note) values
  ('v1-2026-08-20', '2026-08-20', 'Bozza dell''informativa estesa, mai pubblicata: conteneva campi legali da completare.'),
  ('v2-2026-09-05', '2026-09-05', 'Nota pubblica sullo stato attuale: nessun dato raccolto, iscrizioni e pagamenti chiusi.'),
  ('v3-2026-09-07', '2026-09-07', 'Informativa ex art. 13 sui trattamenti attivi al rilascio editoriale: visita del sito, video incorporati, corrispondenza, accesso della redazione.'),
  ('v4-2026-09-07', '2026-09-07', 'Video non piu'' incorporati ma collegati: Google esce dai destinatari. Tempi di conservazione dichiarati per criterio in ogni trattamento.'),
  ('v5-2026-09-08', '2026-09-08', 'Log del fornitore: distinti gli archivi dell''associazione (nessuno) da quelli di Cloudflare, con quello che il fornitore dichiara e quello che non e'' verificabile. Dichiarate le intestazioni NEL della piattaforma.')
on conflict (version) do nothing;

-- -----------------------------------------------------------------------------
-- Il trigger, riscritto.
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

  -- Il profilo si crea alla conferma: qui la conferma email e' il segnale giusto,
  -- perche' dice che quell'indirizzo esiste e appartiene a chi si e' iscritto.
  insert into public.member_profiles (id, first_name, last_name, codice_fiscale)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    nullif(new.raw_user_meta_data ->> 'codice_fiscale', '')
  )
  on conflict (id) do nothing;

  -- Il consenso invece no: va dichiarato, e va detto a quale testo si riferisce.
  versione_dichiarata := nullif(new.raw_user_meta_data ->> 'privacy_version', '');
  consenso_dichiarato := coalesce((new.raw_user_meta_data ->> 'privacy_accepted')::boolean, false);

  if versione_dichiarata is null or consenso_dichiarato is not true then
    -- Nessuna dichiarazione: non si registra niente. L'account esiste, la prova
    -- di consenso no — ed e' corretto che manchi, perche' non e' stata raccolta.
    raise log '[privacy] utente % confermato senza dichiarazione di consenso: nessuna accettazione registrata', new.id;
    return new;
  end if;

  if not exists (select 1 from public.privacy_versions v where v.version = versione_dichiarata) then
    -- Versione sconosciuta al server: non si registra una prova che indica un
    -- testo che non sappiamo quale sia. Meglio un buco visibile di un dato falso.
    raise log '[privacy] utente %: versione informativa sconosciuta (%), nessuna accettazione registrata',
      new.id, versione_dichiarata;
    return new;
  end if;

  -- accepted_at resta l'orologio del database (default della colonna): il momento
  -- dichiarato dal client non fa fede, puo' essere qualunque cosa.
  insert into public.privacy_acceptances (user_id, version)
  values (new.id, versione_dichiarata);

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Diagnostica, da eseguire a mano. NON cancella e NON riscrive niente.
-- Elenca le accettazioni che il vecchio trigger puo' aver fabbricato: righe il
-- cui utente non ha mai dichiarato un consenso nei propri metadata.
-- -----------------------------------------------------------------------------
-- select a.user_id, a.version, a.accepted_at,
--        (u.raw_user_meta_data ? 'privacy_accepted') as ha_dichiarazione
-- from public.privacy_acceptances a
-- join auth.users u on u.id = a.user_id
-- where coalesce((u.raw_user_meta_data ->> 'privacy_accepted')::boolean, false) is not true
-- order by a.accepted_at;
