import { getCollection, type CollectionEntry } from 'astro:content';

export type Articolo = CollectionEntry<'articles'>;

const env = (nome: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[nome] ??
  (typeof process !== 'undefined' ? process.env?.[nome] : undefined);

/**
 * Una build che sta girando su Cloudflare produce un sito con un indirizzo
 * pubblico. Anche una preview di ramo: l'URL non e' segreto, non chiede
 * credenziali e chiunque lo abbia puo' aprirlo. Il `noindex` tiene fuori i
 * motori di ricerca, non le persone.
 */
const suCloudflare = Boolean(env('CF_PAGES') || env('CF_PAGES_BRANCH'));

const bozzeRichieste = env('MOSTRA_BOZZE') === 'true';

/**
 * Via di fuga esplicita: se davanti alla preview c'e' davvero un controllo
 * d'accesso (Cloudflare Access o equivalente), si dichiara con questa variabile
 * e le bozze tornano visibili. Va impostata da chi quel controllo l'ha messo,
 * non da chi vuole solo dare un'occhiata.
 */
const ambienteProtetto = env('BOZZE_AMBIENTE_PROTETTO') === 'true';

/**
 * Le bozze si vedono solo dove guardarle non significa pubblicarle:
 *  - in sviluppo locale (`npm run dev`), dove il sito sta sulla propria macchina;
 *  - in una build locale con MOSTRA_BOZZE=true, per vedere il pezzo impaginato;
 *  - su un ambiente ospitato **solo** se e' dichiarato protetto.
 *
 * Su Cloudflare, MOSTRA_BOZZE da sola non basta e viene ignorata. E' la
 * differenza fra "non finisce su Google" e "non lo puo' leggere nessuno":
 * la prima e' una preferenza per i motori di ricerca, la seconda e' un
 * controllo d'accesso, e solo la seconda tiene privata una bozza.
 */
export const bozzeVisibili: boolean =
  import.meta.env.DEV || (bozzeRichieste && (!suCloudflare || ambienteProtetto));

if (bozzeRichieste && suCloudflare && !ambienteProtetto) {
  console.warn(
    '[articoli] MOSTRA_BOZZE=true ignorata: questa build gira su Cloudflare e produce un sito\n' +
      '           raggiungibile da chiunque abbia l\'indirizzo. Per costruire le bozze su un\n' +
      '           ambiente ospitato serve prima un controllo d\'accesso davanti, e poi\n' +
      '           BOZZE_AMBIENTE_PROTETTO=true per dichiararlo.'
  );
}

/** Dal piu' recente al piu' vecchio. */
function perData(a: Articolo, b: Articolo): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

/** Solo articoli pubblicati. Mai le bozze, in nessun contesto. */
export async function articoliPubblicati(): Promise<Articolo[]> {
  const tutti = await getCollection('articles');
  return tutti.filter((a) => !a.data.bozza).sort(perData);
}

/**
 * Articoli da costruire come pagine: i pubblicati, piu' le bozze quando questa
 * build e' autorizzata a mostrarle.
 */
export async function articoliDaCostruire(): Promise<Articolo[]> {
  const tutti = await getCollection('articles');
  return tutti.filter((a) => !a.data.bozza || bozzeVisibili).sort(perData);
}

/**
 * Data in italiano, senza slittamenti di fuso: la data nasce come data locale
 * (vedi src/content.config.ts) e viene formattata con il calendario locale.
 */
export function dataItaliana(d: Date): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** Forma leggibile dalla macchina per <time datetime>: sempre AAAA-MM-GG. */
export function dataIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
