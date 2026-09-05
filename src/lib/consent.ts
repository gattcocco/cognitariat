// Versione dell'informativa privacy mostrata su /privacy. Incrementare quando la pagina
// cambia in modo sostanziale.
//
// ATTENZIONE: la prova di accettazione (tabella privacy_acceptances) NON legge questo
// valore — per non fidarsi di un dato che il client potrebbe alterare, la versione
// registrata come "accettata" è hardcoded lato server nella migration
// supabase/migrations/0005_privacy_acceptances.sql. Quando questa costante cambia, va
// aggiornata anche lì (in una nuova migration, non modificando quella già applicata).
//
// Fase 5: /privacy non è più la bozza dell'informativa lunga (spostata in
// docs/informativa-privacy-bozza.md) ma una nota breve e vera sullo stato attuale, in cui il
// sito non raccoglie dati. La versione cambia di conseguenza.
//
// BLOCCANTE PRIMA DI RIAPRIRE LE ISCRIZIONI: la migration 0005 registra ancora
// 'v1-2026-08-20' come versione accettata. Oggi è inerte, perché non esiste nessun modulo di
// iscrizione e nessuno può accettare niente; ma nel momento in cui il tesseramento riapre,
// l'informativa estesa va pubblicata e la versione allineata con una NUOVA migration.
export const PRIVACY_POLICY_VERSION = 'v2-2026-09-05';
