-- =============================================================================
-- 0010 — La versione v8 dell'informativa fra quelle note al server.
--
-- Da eseguire sul progetto Supabase quando capita: finche' l'iscrizione online
-- e' chiusa nessuno puo' dichiarare di aver letto una versione, quindi non
-- cambia niente di visibile. Va pero' eseguita PRIMA di riaprire le
-- registrazioni: il trigger della 0007 rifiuta una versione che non conosce, e
-- una presa visione non registrata e' una prova che manca.
--
-- Cosa cambia nella v8 (25/11/2026): il sito raccoglie statistiche di
-- navigazione con Google Analytics, caricato tramite Google Tag Manager e solo
-- dopo un consenso esplicito. E' il primo trattamento del sito pubblico che
-- poggia sul consenso (art. 6.1.a) invece che sul legittimo interesse, e il
-- primo che rimette Google fra i destinatari dopo che ne era uscito con la v4.
-- La scelta di chi legge resta nel suo browser (localStorage), quindi anche la
-- frase «non scriviamo niente nella memoria del tuo browser» non vale piu' ed
-- e' stata riscritta invece che lasciata li'.
-- =============================================================================

insert into public.privacy_versions (version, pubblicata_il, note) values
  ('v8-2026-11-25', '2026-11-25', 'Statistiche di navigazione con Google Analytics via Tag Manager, subordinate a consenso esplicito e revocabile. Google torna fra i destinatari, ma solo per chi accetta. Dichiarata la scelta salvata in localStorage.')
on conflict (version) do nothing;
