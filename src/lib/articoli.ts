import { getCollection, type CollectionEntry } from 'astro:content';

export type Articolo = CollectionEntry<'articles'>;

/**
 * Le bozze si vedono solo dove guardarle non significa pubblicarle:
 *  - in sviluppo locale (`npm run dev`), dove il sito sta sulla propria macchina;
 *  - in una build fatta apposta con MOSTRA_BOZZE=true, per un'anteprima protetta.
 *
 * In una build normale — compresa quella della preview di `dev`, che ha un URL
 * pubblico — le bozze non esistono: niente pagina, niente elenco, niente sitemap.
 * Essere su un ramo di lavoro non rende privato quello che viene messo online.
 */
export const bozzeVisibili: boolean =
  import.meta.env.DEV ||
  import.meta.env.MOSTRA_BOZZE === 'true' ||
  (typeof process !== 'undefined' && process.env?.MOSTRA_BOZZE === 'true');

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
