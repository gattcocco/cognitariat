/**
 * Due controlli sul testo che finisce davvero online, entrambi nati da errori
 * veri trovati a mano in Fase 4 e 5.
 *
 * 1. SEGNAPOSTO. La pagina privacy e' rimasta a lungo una bozza con i dati
 *    legali fra parentesi quadre e una nota «non pubblicare cosi' com'e'»
 *    visibile in pagina. Una bozza si riconosce da sola: qui si cercano
 *    parentesi quadre con dentro del testo, TODO, TBD, lorem ipsum e simili.
 *
 * 2. SPAZI MANGIATI. Astro toglie lo spazio finale prima di un a capo, quindi
 *    una riga di testo seguita da <a> o <strong> sulla riga dopo produce
 *    "scrivici acognitariatz@proton.me". E' successo sette volte in due fasi,
 *    sempre per lo stesso motivo. Nel sorgente si risolve con {' '} in fondo
 *    alla riga.
 *
 * Uso: node scripts/verifica-testi.mjs   (dopo `npm run build`)
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';

/** Segnaposto tipici di una bozza rimasta in pagina. */
const SEGNAPOSTO = [
  { nome: 'parentesi quadre con testo dentro', re: /\[[^\]\n]{2,60}\]/g },
  { nome: 'TODO / TBD / FIXME', re: /\b(TODO|TBD|FIXME|XXX)\b/g },
  { nome: 'lorem ipsum', re: /lorem ipsum/gi },
  { nome: 'da completare / da definire', re: /\bda (completare|definire|verificare)\b/gi },
  { nome: 'placeholder', re: /\bplaceholder\b/gi },
];

/**
 * Testo attaccato a un elemento in linea (o viceversa). Le parentesi quadre di
 * un link markdown non c'entrano: qui si guarda l'HTML prodotto.
 */
const SPAZI = /[\p{L}\p{N},:;)»]<(?:a|strong|em|b|i|span|code)\b|<\/(?:a|strong|em|b|i|span|code)>[\p{L}\p{N}(«]/gu;

function testoVisibile(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

async function fileHtml(dir) {
  const voci = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const v of voci) {
    const p = join(dir, v.name);
    if (v.isDirectory()) out.push(...(await fileHtml(p)));
    else if (v.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const file = await fileHtml(DIST);
if (file.length === 0) {
  console.error(`Nessun HTML in ${DIST}/: esegui prima "npm run build".`);
  process.exit(1);
}

const problemi = [];

for (const f of file) {
  const html = await readFile(f, 'utf8');
  const nome = relative(DIST, f);
  const testo = testoVisibile(html);

  for (const { nome: tipo, re } of SEGNAPOSTO) {
    for (const m of testo.matchAll(re)) {
      problemi.push({ file: nome, tipo, brano: m[0].trim().slice(0, 70) });
    }
  }

  for (const m of html.matchAll(SPAZI)) {
    problemi.push({
      file: nome,
      tipo: 'spazio mancante prima o dopo un elemento in linea',
      brano: html.slice(Math.max(0, m.index - 34), m.index + 46).replace(/\s+/g, ' '),
    });
  }
}

if (problemi.length === 0) {
  console.log(`verifica testi: nessun segnaposto e nessuno spazio mangiato (${file.length} pagine).`);
  process.exit(0);
}

console.error(`verifica testi: ${problemi.length} problema/i in ${file.length} pagine.`);
for (const p of problemi) {
  console.error(`  [${p.file}] ${p.tipo}\n      …${p.brano}…`);
}
console.error(
  '\nGli spazi mangiati si risolvono nel sorgente con {\' \'} in fondo alla riga di testo.\n' +
    'I segnaposto vanno completati o tolti: una pagina pubblica non deve mostrare una bozza.'
);
process.exit(1);
