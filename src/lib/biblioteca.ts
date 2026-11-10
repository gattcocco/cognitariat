import { getCollection, type CollectionEntry } from 'astro:content';
import { bozzeVisibili } from './articoli';
import { LICENZE } from './biblioteca-voci';

export type Voce = CollectionEntry<'biblioteca'>;

/** Dal piu' recente al piu' vecchio; a parita' d'anno, per titolo, cosi' l'ordine non cambia da una build all'altra. */
function perAnno(a: Voce, b: Voce): number {
  return b.data.anno - a.data.anno || a.data.title.localeCompare(b.data.title, 'it');
}

/** Solo voci pubblicate. Mai le bozze: e' quello che finisce nella sitemap. */
export async function vociPubblicate(): Promise<Voce[]> {
  const tutte = await getCollection('biblioteca');
  return tutte.filter((v) => !v.data.bozza).sort(perAnno);
}

/** Voci da mostrare: le pubblicate, piu' le bozze quando la build e' autorizzata a mostrarle. */
export async function vociDaCostruire(): Promise<Voce[]> {
  const tutte = await getCollection('biblioteca');
  return tutte.filter((v) => !v.data.bozza || bozzeVisibili).sort(perAnno);
}

/** La pagina che spiega la licenza, se ne ha una (il pubblico dominio e l'accesso libero no). */
export function urlLicenza(nome: string): string | undefined {
  return LICENZE.find((l) => l.nome === nome)?.url;
}

/**
 * Il nome del sito dove sta il file, da mostrare accanto al pulsante.
 * Chi clicca esce dal nostro sito: gli diciamo dove va prima che ci vada.
 */
export function sitoDi(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
