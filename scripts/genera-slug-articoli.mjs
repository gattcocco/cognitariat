/**
 * Scrive l'elenco degli slug degli articoli che esistono in questa build, per il
 * middleware di /blog/ (functions/blog/_middleware.ts).
 *
 * PERCHE' L'ELENCO NON SI DEDUCE DAI FILE MARKDOWN
 * Si potrebbe leggere `src/content/articles/*.md` e filtrare le bozze. Sarebbe
 * una seconda implementazione della regola che sta in `src/lib/articoli.ts`, e
 * due implementazioni della stessa regola divergono: basta che qualcuno cambi il
 * significato di `bozza`, o aggiunga una condizione, e il middleware comincia a
 * mentire — senza che nessun controllo se ne accorga.
 *
 * Qui l'elenco si legge invece da `dist/blog/`, cioe' **dalle pagine che la build
 * ha effettivamente prodotto**. Non e' una copia della regola: e' il suo
 * risultato. Se un articolo e' una bozza la sua cartella non c'e', e lo slug non
 * finisce nell'elenco perche' la pagina non esiste, non perche' un `if` lo ha
 * escluso. In una build autorizzata a mostrare le bozze le cartelle ci sono, e
 * l'elenco le contiene: si adegua da se'.
 *
 * QUANDO GIRA
 * Subito dopo `astro build`, dentro `npm run build` — quindi anche nella build di
 * Cloudflare, che raccoglie `functions/` dopo aver eseguito il comando di build.
 * Il file prodotto e' generato, non si modifica a mano ed e' fuori da Git.
 *
 * uso: node scripts/genera-slug-articoli.mjs
 */
import { readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DIST_BLOG = 'dist/blog';
const USCITA = 'generato/slug-articoli.ts';

/** Una cartella e' un articolo se contiene la pagina costruita. */
async function eUnArticolo(nome) {
  try {
    await access(join(DIST_BLOG, nome, 'index.html'));
    return true;
  } catch {
    return false;
  }
}

let voci;
try {
  voci = await readdir(DIST_BLOG, { withFileTypes: true });
} catch {
  console.error(
    `Manca ${DIST_BLOG}: questo script va eseguito dopo "astro build", non prima.\n` +
      'In npm run build e\' gia\' nell\'ordine giusto.'
  );
  process.exit(1);
}

const slug = [];
for (const v of voci) {
  if (v.isDirectory() && (await eUnArticolo(v.name))) slug.push(v.name);
}
slug.sort();

const contenuto = `// GENERATO da scripts/genera-slug-articoli.mjs — non modificare a mano.
// Rigenerato a ogni build da quello che c'e' in dist/blog/, cioe' dalle pagine
// che la build ha davvero prodotto. Fuori da Git di proposito: un elenco
// versionato si sfaserebbe dal contenuto al primo articolo pubblicato dal CMS.
//
// Articoli in questa build: ${slug.length}
export const SLUG_ARTICOLI: ReadonlySet<string> = new Set(${JSON.stringify(slug, null, 2)});
`;

await mkdir('generato', { recursive: true });
await writeFile(USCITA, contenuto, 'utf8');

console.log(
  `slug articoli: ${slug.length} in ${USCITA}` + (slug.length ? ` (${slug.join(', ')})` : '')
);
