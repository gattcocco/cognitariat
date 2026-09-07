/**
 * Dati dell'ente, in un posto solo.
 *
 * Stanno qui e non sparsi nelle pagine perche' cambiano per via amministrativa,
 * non editoriale: quando arriva la conferma della sede o una PEC, si aggiorna
 * questo file e si ricostruisce: nessuna pagina va toccata.
 *
 * I campi facoltativi hanno tre stati, e la differenza conta:
 *
 *   - stringa piena  -> il dato c'e', e le pagine lo mostrano;
 *   - stringa vuota  -> non ancora confermato. Sul sito non compare niente: ne'
 *                       il dato, ne' una nota che spieghi cosa manca;
 *   - null           -> verificato che non esiste. Anche qui sul sito non
 *                       compare niente, ma per un motivo diverso, e chi legge
 *                       questo file lo sa senza doverlo richiedere.
 *
 * Tenere separate «non lo sappiamo ancora» e «abbiamo controllato, non c'e'»
 * evita che qualcuno ricontrolli due volte la stessa cosa o, peggio, che ne
 * inventi una per riempire il buco.
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

  /**
   * Partita IVA: NON esiste. Confermato dall'associazione il 07/09/2026, non
   * dedotto dal fatto che non compaia nei documenti — l'assenza in un atto non
   * prova l'assenza del dato, e prima di questa conferma era annotata come da
   * verificare.
   *
   * Null e non stringa vuota apposta: non e' un dato in attesa, e' un dato
   * verificato che non c'e'. Non va mai sostituito con il codice fiscale: sono
   * due identificativi diversi, e un'associazione senza attivita' commerciale ha
   * il primo e non il secondo.
   */
  partitaIva: null,

  /** PEC: da valorizzare se e quando esiste. Nessun recapito inventato. */
  pec: '',
} as const;

/** Vero solo quando c'e' un indirizzo confermato da mostrare. */
export const haSede = associazione.sede.trim().length > 0;

/** Vero solo quando c'e' una PEC confermata da mostrare. */
export const haPec = associazione.pec.trim().length > 0;

/**
 * Falso, e resta falso finche' la partita IVA non esiste. L'helper c'e' lo
 * stesso, cosi' le pagine chiedono «c'e'?» invece di ragionare sul tipo del
 * campo, e il giorno in cui l'associazione ne aprisse una basterebbe scrivere
 * il numero qui sopra.
 */
export const haPartitaIva: boolean =
  typeof associazione.partitaIva === 'string' &&
  (associazione.partitaIva as string).trim().length > 0;
