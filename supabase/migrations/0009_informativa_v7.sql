-- =============================================================================
-- 0009 — La versione v7 dell'informativa fra quelle note al server.
--
-- Da eseguire sul progetto Supabase quando capita: finche' l'iscrizione online
-- e' chiusa nessuno puo' dichiarare di aver letto una versione, quindi non
-- cambia niente di visibile. Va pero' eseguita PRIMA di riaprire le
-- registrazioni: il trigger della 0007 rifiuta una versione che non conosce, e
-- una presa visione non registrata e' una prova che manca.
--
-- Cosa cambia nella v7 (24/09/2026): il tesseramento apre per bonifico. La
-- sezione 6 dell'informativa descrive i dati che arrivano davvero — nome e
-- cognome nella causale, quello che si scrive per email, la contabile del
-- bonifico — e aggiunge la banca fra i destinatari. L'iscrizione online resta
-- chiusa.
-- =============================================================================

insert into public.privacy_versions (version, pubblicata_il, note) values
  ('v7-2026-09-24', '2026-09-24', 'Tesseramento aperto per bonifico: dati che arrivano con il versamento e per email, banca fra i destinatari, contabilita'' sugli estratti conto. Iscrizione online ancora chiusa.')
on conflict (version) do nothing;
