import { getCollection, type CollectionEntry } from 'astro:content';
import { bozzeVisibili } from './articoli';
import { LICENZE, TIPI, type Tipo } from './biblioteca-voci';

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

/** Le voci raggruppate per tipo, nell'ordine di `TIPI`; i tipi senza voci non compaiono. */
export function perTipo(voci: Voce[]): { tipo: Tipo; voci: Voce[] }[] {
  return TIPI.map((tipo) => ({ tipo, voci: voci.filter((v) => v.data.tipo === tipo) })).filter(
    (g) => g.voci.length > 0
  );
}

/** Il pulsante dice che cosa succede cliccando: un PDF si legge, un libro si cerca, un programma si scarica. */
export function etichettaAzione(tipo: Tipo, haPdf: boolean): string {
  // Lo scaffale e' l'unico posto dove il file e' nostro: li' non si «va» da
  // nessuna parte, si scarica e basta, e il pulsante deve dirlo.
  if (tipo === 'Libro a scaffale') return 'Scarica il libro';
  if (haPdf) return 'Leggi il PDF';
  return tipo === 'Strumento' ? 'Vai al sito' : 'Vai alla scheda';
}

/**
 * Vero se l'indirizzo resta dentro il sito: i PDF dello scaffale, gli unici
 * file che ospitiamo. Serve alla pagina per non dire «si apre su...» a chi non
 * sta andando da nessuna parte, e per non passare a `sitoDi` un percorso che
 * non e' un URL assoluto.
 */
export function interno(url: string): boolean {
  return url.startsWith('/');
}

/**
 * L'ancora di una sezione. Il tipo non puo' finire in un id cosi' com'e':
 * «Libro a scaffale» contiene spazi, e un id con gli spazi rende il
 * collegamento del sommario un link che non porta da nessuna parte.
 */
export function ancoraTipo(tipo: Tipo): string {
  return `sezione-${tipo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
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
