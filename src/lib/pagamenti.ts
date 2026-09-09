/**
 * Interruttore dei pagamenti, lato server.
 *
 * Fase 5: la struttura Stripe resta intera e pronta a essere riaccesa, ma non
 * deve poter incassare niente. Nascondere i pulsanti non basta: gli endpoint
 * sono raggiungibili con una POST fatta a mano, e un endpoint che risponde crea
 * sessioni di pagamento vere. Il blocco quindi sta qui e va invocato come
 * PRIMISSIMA istruzione di ogni endpoint di pagamento, prima di leggere il
 * corpo della richiesta, prima di validare il token dell'utente (che e' gia'
 * una chiamata di rete verso Supabase), prima di costruire il client Stripe e
 * prima di qualunque scrittura sul database.
 *
 * Due condizioni, non una:
 *  - la bandiera PAGAMENTI_ATTIVI deve valere esattamente "true". Assente,
 *    vuota, "false", "1", "si": tutto il resto significa chiuso. La regola e'
 *    volutamente rigida — una variabile scritta male deve chiudere, non aprire;
 *  - se la bandiera e' accesa ma manca anche una sola delle variabili che
 *    servono a quell'endpoint, si risponde comunque con un errore controllato.
 *    Senza questo, una configurazione parziale porterebbe a costruire il client
 *    Stripe con una chiave `undefined` e a fallire dentro la libreria, con un
 *    500 opaco al posto di un messaggio sensato.
 *
 * Il corpo della risposta non elenca quali variabili mancano: quel dettaglio
 * finisce nei log del runtime, non in una risposta pubblica.
 */

/**
 * Ambiente visto dal cancello: solo lettura e volutamente largo. L'oggetto che
 * Cloudflare passa alle Functions non contiene solo stringhe (c'e' anche il
 * binding ASSETS), quindi qui si accetta `unknown` e si considera assente
 * qualunque valore che non sia una stringa piena: una variabile configurata
 * male non deve poter aprire i pagamenti per distrazione dei tipi.
 */
export type AmbientePagamenti = Readonly<Record<string, unknown>>;

export type MotivoBlocco = 'non_attivi' | 'configurazione_incompleta';

export interface Bloccato {
  readonly bloccato: true;
  readonly motivo: MotivoBlocco;
  readonly risposta: Response;
}

export interface Consentito {
  readonly bloccato: false;
}

export type EsitoCancello = Bloccato | Consentito;

/** Variabili necessarie a ciascuno dei tre percorsi di pagamento. */
export const CHIAVI_QUOTA = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_STUDENTE',
  'STRIPE_PRICE_COGNITARIO',
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SITE_URL',
] as const;

export const CHIAVI_SOSTENITORE = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_SOSTENITORE', 'SITE_URL'] as const;

export const CHIAVI_MERCH = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_MERCH_TSHIRT',
  'STRIPE_PRICE_MERCH_PIN',
  'STRIPE_PRICE_MERCH_POSTER',
  'SITE_URL',
] as const;

const MESSAGGI: Record<MotivoBlocco, string> = {
  non_attivi:
    'I pagamenti sono sospesi. Il tesseramento non è ancora aperto e non stiamo raccogliendo quote né vendendo merch. Quando riapriremo lo scriveremo sul sito.',
  configurazione_incompleta:
    'I pagamenti non sono disponibili in questo momento. Nessun addebito è stato avviato. Riprova più tardi o scrivici a cognitariatz@proton.me.',
};

function rispostaBloccata(motivo: MotivoBlocco): Response {
  return new Response(JSON.stringify({ error: MESSAGGI[motivo], pagamenti: motivo }), {
    status: 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Una pagina o una CDN non devono conservare questa risposta: quando i
      // pagamenti si riaprono, deve sparire subito.
      'cache-control': 'no-store',
    },
  });
}

/** true solo per la stringa esatta "true": qualsiasi altro valore tiene chiuso. */
export function pagamentiAbilitati(env: AmbientePagamenti): boolean {
  return env.PAGAMENTI_ATTIVI === 'true';
}

/** Variabili richieste che risultano assenti o vuote. */
export function chiaviMancanti(env: AmbientePagamenti, richieste: readonly string[]): string[] {
  return richieste.filter((k) => {
    const v = env[k];
    return typeof v !== 'string' || v.trim() === '';
  });
}

/**
 * Da invocare per prima cosa in ogni endpoint di pagamento.
 * Se `bloccato` è true, restituire `risposta` e non fare nient'altro.
 */
export function cancelloPagamenti(
  env: AmbientePagamenti,
  richieste: readonly string[]
): EsitoCancello {
  if (!pagamentiAbilitati(env)) {
    return { bloccato: true, motivo: 'non_attivi', risposta: rispostaBloccata('non_attivi') };
  }

  const mancanti = chiaviMancanti(env, richieste);
  if (mancanti.length > 0) {
    // Nei log del runtime, non nella risposta: dice a chi gestisce cosa manca
    // senza raccontarlo a chi ha fatto la richiesta.
    console.warn(
      `[pagamenti] bandiera attiva ma configurazione incompleta: mancano ${mancanti.join(', ')}`
    );
    return {
      bloccato: true,
      motivo: 'configurazione_incompleta',
      risposta: rispostaBloccata('configurazione_incompleta'),
    };
  }

  return { bloccato: false };
}
