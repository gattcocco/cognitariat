/**
 * Dati dell'ente, in un posto solo.
 *
 * Stanno qui e non sparsi nelle pagine perche' cambiano per via amministrativa,
 * non editoriale: quando arriva la conferma della sede o una PEC, si aggiorna
 * questo file e si ricostruisce: nessuna pagina va toccata.
 *
 * I campi facoltativi sono stringhe vuote finche' non sono confermati, e le
 * pagine li rendono solo se valorizzati. Vuoto vuol dire "non ancora
 * confermato", mai "non esiste": la differenza e' che nel primo caso sul sito
 * non compare niente, invece di comparire una spiegazione di cosa manca.
 *
 * Qui dentro vanno solo dati dell'ente. Indirizzi di persone, nomi dei soci e
 * dati del legale rappresentante non entrano in questo file ne' in nessun altro
 * del repository.
 */
export const associazione = {
  /** Come compare nell'atto costitutivo e nel verbale di nomina. */
  denominazione: 'COG U — Sindacato del Cognitariato',

  /** Associazione sindacale non riconosciuta, artt. 36 ss. c.c. e art. 39 Cost. */
  formaGiuridica: 'associazione sindacale non riconosciuta, senza fini di lucro',

  /** Atto costitutivo del 12 luglio 2026, registrato all'Agenzia delle Entrate. */
  costituitaIl: '2026-07-12',
  costituitaIlTesto: '12 luglio 2026',

  codiceFiscale: '98031460151',

  /**
   * Indirizzo email dell'ente. E' quello gia' in uso su tutto il sito e nella
   * corrispondenza: non e' stato inventato qui.
   */
  email: 'cognitariatz@proton.me',

  /**
   * Sede legale: aggiornamento amministrativo pendente. Finche' e' vuota, sulle
   * pagine pubbliche non compare nessun indirizzo e nessuna nota che spieghi
   * perche'. Quando e' confermata si scrive qui, per intero.
   */
  sede: '',

  /** PEC: da valorizzare se e quando esiste. Nessun recapito inventato. */
  pec: '',
} as const;

/** Vero solo quando c'e' un indirizzo confermato da mostrare. */
export const haSede = associazione.sede.trim().length > 0;

/** Vero solo quando c'e' una PEC confermata da mostrare. */
export const haPec = associazione.pec.trim().length > 0;
