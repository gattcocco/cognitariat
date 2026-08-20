// Versione dell'informativa privacy mostrata su /privacy. Incrementare quando la pagina
// cambia in modo sostanziale.
//
// ATTENZIONE: la prova di accettazione (tabella privacy_acceptances) NON legge questo
// valore — per non fidarsi di un dato che il client potrebbe alterare, la versione
// registrata come "accettata" è hardcoded lato server nella migration
// supabase/migrations/0005_privacy_acceptances.sql. Quando questa costante cambia, va
// aggiornata anche lì (in una nuova migration, non modificando quella già applicata).
export const PRIVACY_POLICY_VERSION = 'v1-2026-08-20';
