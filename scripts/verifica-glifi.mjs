/**
 * Controlla che ogni carattere visibile del sito costruito sia coperto da uno dei
 * font che ospitiamo noi.
 *
 * Serve perche' i file in public/fonts/ non sono i font completi: sono i due
 * sottoinsiemi latini di Google piu' un sottoinsieme "latin-ext" ridotto ai segni
 * che ci servono davvero (schwa compresa). E' una scelta di peso — per Inter,
 * 28 KB invece di 133 — ma ha un effetto collaterale silenzioso: se un testo
 * nuovo introduce un carattere fuori dagli intervalli dichiarati, il browser non
 * segnala niente, prende il font di sistema e quella parola si stacca dal resto
 * della pagina.
 *
 * Qui l'errore diventa rumoroso: gli unicode-range si leggono da src/styles/font.css,
 * cosi' la fonte di verita' resta una sola, e si confrontano con i caratteri
 * realmente presenti nell'HTML prodotto.
 *
 * Uso: node scripts/verifica-glifi.mjs  (dopo `npm run build`)
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const CSS_FONT = 'src/styles/font.css';
const DIST = 'dist';

/** Caratteri che non hanno bisogno di un glifo: spazi, controlli, a-capo. */
function daIgnorare(cp) {
  return cp <= 0x20 || cp === 0x7f || cp === 0xa0 || cp === 0x200b || cp === 0xfeff;
}

async function intervalliDichiarati() {
  const css = await readFile(CSS_FONT, 'utf8');
  const intervalli = [];
  for (const blocco of css.matchAll(/unicode-range:\s*([^;]+);/gi)) {
    for (const voce of blocco[1].split(',')) {
      const v = voce.trim();
      const singolo = v.match(/^U\+([0-9A-F]+)$/i);
      const coppia = v.match(/^U\+([0-9A-F]+)-([0-9A-F]+)$/i);
      if (singolo) {
        const n = parseInt(singolo[1], 16);
        intervalli.push([n, n]);
      } else if (coppia) {
        intervalli.push([parseInt(coppia[1], 16), parseInt(coppia[2], 16)]);
      } else {
        throw new Error(`unicode-range non riconosciuto in ${CSS_FONT}: "${v}"`);
      }
    }
  }
  if (intervalli.length === 0) throw new Error(`nessun unicode-range trovato in ${CSS_FONT}`);
  return intervalli;
}

function coperto(cp, intervalli) {
  return intervalli.some(([a, b]) => cp >= a && cp <= b);
}

async function fileHtml(dir) {
  const voci = await readdir(dir, { withFileTypes: true });
  const risultato = [];
  for (const v of voci) {
    const p = join(dir, v.name);
    if (v.isDirectory()) risultato.push(...(await fileHtml(p)));
    else if (v.name.endsWith('.html')) risultato.push(p);
  }
  return risultato;
}

/**
 * Testo effettivamente visibile: via script, style, commenti e tag. I contenuti
 * di <script> non vengono disegnati, e includerli farebbe fallire il controllo
 * su caratteri che nessuno vede.
 */
function testoVisibile(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

const intervalli = await intervalliDichiarati();
const file = await fileHtml(DIST);
if (file.length === 0) {
  console.error(`Nessun HTML in ${DIST}/: esegui prima "npm run build".`);
  process.exit(1);
}

const scoperti = new Map(); // codepoint -> Set(file)
let esaminati = 0;

for (const f of file) {
  const testo = testoVisibile(await readFile(f, 'utf8'));
  for (const ch of testo) {
    const cp = ch.codePointAt(0);
    esaminati++;
    if (daIgnorare(cp) || coperto(cp, intervalli)) continue;
    if (!scoperti.has(cp)) scoperti.set(cp, new Set());
    scoperti.get(cp).add(relative(DIST, f));
  }
}

const etichetta = `${file.length} pagine, ${esaminati} caratteri, ${intervalli.length} intervalli dichiarati`;

if (scoperti.size === 0) {
  console.log(`verifica glifi: nessun carattere fuori dai font che ospitiamo (${etichetta}).`);
  process.exit(0);
}

console.error(`verifica glifi: ${scoperti.size} carattere/i non coperto/i dai font in public/fonts/ (${etichetta}).`);
for (const [cp, dove] of [...scoperti].sort((a, b) => a[0] - b[0])) {
  const hex = cp.toString(16).toUpperCase().padStart(4, '0');
  console.error(`  U+${hex}  "${String.fromCodePoint(cp)}"  in: ${[...dove].join(', ')}`);
}
console.error(
  '\nOgni carattere elencato verrebbe disegnato dal font di sistema, staccandosi dal resto.\n' +
    'Rimedio: sostituirlo con un carattere coperto, oppure rigenerare i sottoinsiemi in\n' +
    'public/fonts/ includendolo e aggiornare gli unicode-range in src/styles/font.css.'
);
process.exit(1);
