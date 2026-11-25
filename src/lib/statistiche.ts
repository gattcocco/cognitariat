/**
 * Statistiche di navigazione: la configurazione sta qui, in un posto solo.
 *
 * Decisione del committente del 25/11/2026: il sito raccoglie statistiche con
 * Google Tag Manager (che a sua volta carica quello che e' configurato nel
 * contenitore, oggi Google Analytics). Fino a quel giorno il sito pubblico non
 * contattava nessuna terza parte, ed e' il motivo per cui questo file esiste
 * invece di avere un indirizzo scritto dentro un componente: il numero del
 * contenitore, la chiave della scelta e la sua versione sono tre cose che
 * vanno lette insieme, e cambiarne una sola e' il modo tipico di rompere il
 * consenso senza accorgersene.
 *
 * COSA NON FA QUESTO FILE. Non carica niente. Il contenitore viene caricato
 * solo da src/components/BannerConsenso.astro, e solo dopo un «Accetto»
 * esplicito. Un contenitore caricato al primo colpo d'occhio renderebbe il
 * riquadro una decorazione: quando la persona risponde, i cookie ci sono gia'.
 */

/** Il contenitore GTM dell'associazione. */
export const CONTENITORE_GTM = 'GTM-KLLVN395';

/**
 * Dove finisce la risposta, in localStorage. Il valore ha la forma
 * `si:v1` / `no:v1`: la risposta e la versione della domanda, insieme.
 */
export const CHIAVE_CONSENSO = 'cogu-statistiche';

/**
 * Versione della domanda posta nel riquadro.
 *
 * Va incrementata quando cambia *cosa* si sta chiedendo — un altro strumento,
 * un'altra finalita', un altro destinatario — non quando si riscrive una frase.
 * Alzarla rimette la domanda a chi aveva gia' risposto, che e' esattamente
 * quello che serve quando l'oggetto del consenso non e' piu' lo stesso: un
 * «si'» dato per una cosa non vale per un'altra.
 */
export const VERSIONE_CONSENSO = 'v1';
