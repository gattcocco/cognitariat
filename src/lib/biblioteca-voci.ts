/**
 * Elenchi chiusi della biblioteca: licenze e temi.
 *
 * Stanno in un modulo a parte, senza nessun import da Astro, perche' servono a
 * tre posti che non si parlano fra loro: lo schema dei contenuti
 * (src/content.config.ts), la configurazione del CMS
 * (src/pages/admin/config.yml.ts) e la pagina pubblica. Con una sola fonte non
 * si puo' avere una licenza che il CMS offre e lo schema rifiuta — cioe' un
 * salvataggio che riesce e una build che si ferma.
 *
 * Aggiungere una licenza o un tema e' una riga qui sotto: lo schema, il modulo
 * del CMS e la pagina la prendono da soli.
 */

/**
 * Le licenze ammesse. `url` e' la pagina che spiega la licenza, e la scheda
 * pubblica ci rimanda: scrivere «CC BY-NC-ND» senza dire cosa significa lascia
 * chi legge a indovinare.
 *
 * L'ultima voce non e' una licenza Creative Commons: e' per i testi che
 * l'editore lascia leggere e scaricare senza abbonamento ma senza una licenza
 * dichiarata. Il criterio della biblioteca e' «CC o comunque libera», e quel
 * caso e' il confine: scegliendolo, la scheda dice apertamente che non e' una
 * CC, invece di lasciarlo credere.
 */
export const LICENZE = [
  { nome: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/deed.it' },
  { nome: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.it' },
  { nome: 'CC BY-NC 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/deed.it' },
  { nome: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it' },
  { nome: 'CC BY-ND 4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/deed.it' },
  { nome: 'CC BY-NC-ND 4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.it' },
  { nome: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.it' },
  { nome: 'Pubblico dominio', url: undefined },
  { nome: 'Accesso libero, non CC', url: undefined },
  // Le ultime tre non sono licenze di testi ma di libri e programmi: stanno
  // nella stessa lista perche' la scheda deve dire apertamente a che condizioni
  // si ha a che fare, anche quando la risposta e' «si paga» o «e' software».
  { nome: 'Commerciale (a pagamento)', url: undefined },
  { nome: 'Software libero (MIT)', url: 'https://opensource.org/license/mit' },
  { nome: 'Licenza propria, non open source', url: undefined },
] as const;

export type NomeLicenza = (typeof LICENZE)[number]['nome'];

/** Solo i nomi, nella forma che `z.enum` richiede: almeno uno, e fissi. */
export const NOMI_LICENZE = LICENZE.map((l) => l.nome) as [NomeLicenza, ...NomeLicenza[]];

/**
 * Che cosa e' una voce, e quindi come si legge il suo pulsante: un paper o un
 * rapporto si scarica, un libro si cerca o si compra, uno strumento si installa.
 * Un elenco chiuso come i temi, per lo stesso motivo.
 */
export const TIPI = ['Paper', 'Rapporto', 'Libro', 'Strumento'] as const;
export type Tipo = (typeof TIPI)[number];
export const NOMI_TIPI = [...TIPI] as [Tipo, ...Tipo[]];

/**
 * I temi, nell'ordine in cui il CMS li offre. Un elenco chiuso e non un campo
 * libero: con il testo libero «Lavoro» e «lavoro e piattaforme» diventano due
 * temi, e la biblioteca si sfilaccia senza che nessuno l'abbia deciso.
 */
export const TEMI = [
  'Rischi e limiti dei modelli',
  'Ambiente ed energia',
  'Lavoro e piattaforme',
  'Potere e valori della ricerca',
  'Panorama e fondamenti',
  'IA locale e autonomia tecnica',
  'Dati, partecipazione e diritti',
] as const;

export type Tema = (typeof TEMI)[number];
export const NOMI_TEMI = [...TEMI] as [Tema, ...Tema[]];
