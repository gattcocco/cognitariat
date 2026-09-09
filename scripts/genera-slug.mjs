/**
 * Scrive l'elenco degli slug che esistono in questa build, per i middleware che
 * stanno davanti a /blog/ e /agenda/.
 *
 * PERCHE' L'ELENCO NON SI DEDUCE DAI FILE MARKDOWN
 * Si potrebbe leggere `src/content/**` e filtrare le bozze. Sarebbe una seconda
 * implementazione della regola che sta in `src/lib/articoli.ts`, e due
 * implementazioni della stessa regola divergono: basta che qualcuno cambi il
 * significato di `bozza`, o aggiunga una condizione, e i middleware cominciano a
 * mentire — senza che nessun controllo se ne accorga.
 *
 * Qui l'elenco si legge invece da `dist/`, cioe' **dalle pagine che la build ha
 * effettivamente prodotto**. Non e' una copia della regola: e' il suo risultato.
 * Se un contenuto e' una bozza la sua cartella non c'e', e lo slug non finisce
 * nell'elenco perche' la pagina non esiste, non perche' un `if` lo ha escluso.
 * In una build autorizzata a mostrare le bozze le cartelle ci sono, e l'elenco
 * le contiene: si adegua da se'.
 *
 * QUANDO GIRA
 * Subito dopo `astro build`, dentro `npm run build` — quindi anche nella build di
 * Cloudflare, che raccoglie `functions/` dopo aver eseguito il comando di build.
 * Il file prodotto e' generato, non si modifica a mano ed e' fuori da Git.
 *
 * uso: node scripts/genera-slug.mjs
 */
import { readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

/** Le sezioni protette: nome della cartella sotto dist/, e chiave nell'elenco. */
const SEZIONI = ['blog', 'agenda'];
const USCITA = 'generato/slug-pagine.ts';

async function esiste(percorso) {
  try {
    await access(percorso);
    return true;
  } catch {
    return false;
  }
}

/** Una cartella e' una pagina se contiene l'HTML costruito. */
async function slugDi(sezione) {
  const base = join('dist', sezione);
  if (!(await esiste(base))) {
    console.error(
      `Manca dist/${sezione}/: questo script va eseguito dopo "astro build", non prima.\n` +
        'In npm run build e\' gia\' nell\'ordine giusto.'
    );
    process.exit(1);
  }
  const voci = await readdir(base, { withFileTypes: true });
  const slug = [];
  for (const v of voci) {
    if (v.isDirectory() && (await esiste(join(base, v.name, 'index.html')))) slug.push(v.name);
  }
  return slug.sort();
}

const perSezione = {};
for (const s of SEZIONI) perSezione[s] = await slugDi(s);

const righe = SEZIONI.map(
  (s) => `  ${s}: new Set(${JSON.stringify(perSezione[s], null, 2).replace(/\n/g, '\n  ')}),`
).join('\n');

const contenuto = `// GENERATO da scripts/genera-slug.mjs — non modificare a mano.
// Rigenerato a ogni build da quello che c'e' in dist/, cioe' dalle pagine che la
// build ha davvero prodotto. Fuori da Git di proposito: un elenco versionato si
// sfaserebbe dal contenuto al primo contenuto pubblicato dal CMS.
//
${SEZIONI.map((s) => `// ${s}: ${perSezione[s].length}`).join('\n')}
export const SLUG_PER_SEZIONE: Record<string, ReadonlySet<string>> = {
${righe}
};
`;

await mkdir('generato', { recursive: true });
await writeFile(USCITA, contenuto, 'utf8');

console.log(
  'slug per sezione: ' +
    SEZIONI.map((s) => `${s} ${perSezione[s].length}`).join(', ') +
    ` — in ${USCITA}`
);
