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
// L'allineamento è preparato in supabase/migrations/0007_consenso_privacy_esplicito.sql,
// NON ancora applicata al database remoto. La 0007 non si limita a cambiare la costante:
// toglie il difetto per cui la conferma dell'email veniva registrata come prova di aver
// accettato l'informativa. Cliccare un magic link dimostra che quella casella è tua, non che
// ti sia stato mostrato un testo né quale versione. D'ora in poi l'accettazione si scrive solo
// se i metadata di iscrizione la dichiarano, con la versione effettivamente vista, e solo se
// quella versione è fra quelle note al server.
//
// RESTA DA FARE PRIMA DI RIAPRIRE: il modulo di iscrizione (rimosso in Fase 4) deve passare
// privacy_version e privacy_accepted in options.data di signInWithOtp(), con una casella di
// consenso separata e non pre-spuntata. Senza quei campi non viene registrato niente — è
// voluto: meglio nessuna prova che una prova finta.
// v3: da nota sullo stato attuale a informativa vera e propria ex art. 13 GDPR,
// sui trattamenti effettivamente attivi al rilascio editoriale — visita del sito,
// video incorporati, corrispondenza, accesso della redazione.
//
// v4: i video non sono più incorporati ma collegati. Cambia un trattamento, non
// una virgola: Google esce dall'elenco dei destinatari e il sito pubblico non
// contatta più nessuna terza parte. Nella stessa versione ogni trattamento
// dichiara un tempo di conservazione o il criterio con cui si determina, come
// chiede l'art. 13.2.a — vedi docs/conservazione-dati.md per le decisioni che
// restano da deliberare.
//
// Le versioni note al server stanno in supabase/migrations/0007_consenso_privacy_esplicito.sql,
// che NON è ancora applicata al database remoto: v3 e v4 sono state aggiunte lì.
export const PRIVACY_POLICY_VERSION = 'v4-2026-09-07';
