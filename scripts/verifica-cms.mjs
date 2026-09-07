/**
 * Tiene insieme le due meta' dello stesso contratto: i campi che il CMS fa
 * compilare alla redazione e i campi che il sito si aspetta di trovare.
 *
 * Se qualcuno aggiunge un campo allo schema e si dimentica del CMS, la redazione
 * non ha modo di compilarlo. Se lo aggiunge al CMS e si dimentica dello schema,
 * la build fallisce dopo che l'articolo e' gia' stato salvato: l'errore compare
 * a chi non l'ha causato, mezz'ora dopo, e sembra che il sito sia rotto.
 *
 * Si controlla anche la data. Il widget deve restare su 'YYYY-MM-DD' con
 * picker_utc false: con l'orario e il fuso, una data scritta il 6 settembre puo'
 * comparire sul sito come 5 settembre, ed e' un errore che nessuno collega alla
 * configurazione del CMS.
 *
 * Uso: node scripts/verifica-cms.mjs   (dopo `npm run build`)
 */
import { readFile } from 'node:fs/promises';

const CONFIG = 'dist/admin/config.yml';
const SCHEMA = 'src/content.config.ts';

/** Il corpo Markdown non e' un campo del frontmatter: sta nel file, non sopra. */
const SOLO_NEL_CMS = new Set(['body']);

const problemi = [];

let config;
try {
  config = await readFile(CONFIG, 'utf8');
} catch {
  console.error(`Manca ${CONFIG}: esegui prima "npm run build".`);
  process.exit(1);
}
const schema = await readFile(SCHEMA, 'utf8');

// --- Campi dichiarati nel CMS ------------------------------------------------
const campiCms = new Set(
  [...config.matchAll(/^\s{6,}name:\s*([A-Za-z][A-Za-z0-9_]*)\s*$/gm)].map((m) => m[1])
);

// --- Campi dichiarati nello schema del sito ---------------------------------
const corpoSchema = schema.slice(schema.indexOf('z.object({'));
const campiSchema = new Set(
  [...corpoSchema.matchAll(/^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*z\./gm)].map((m) => m[1])
);

if (campiCms.size === 0) problemi.push(`Nessun campo trovato in ${CONFIG}: il formato e' cambiato?`);
if (campiSchema.size === 0) problemi.push(`Nessun campo trovato in ${SCHEMA}: il formato e' cambiato?`);

for (const c of campiCms) {
  if (!campiSchema.has(c) && !SOLO_NEL_CMS.has(c)) {
    problemi.push(
      `Il CMS fa compilare "${c}", ma lo schema del sito non lo conosce: quello che scrive la\n` +
        `     redazione verrebbe ignorato, o farebbe fallire la build.`
    );
  }
}
for (const c of campiSchema) {
  if (!campiCms.has(c)) {
    problemi.push(
      `Lo schema prevede "${c}", ma nel CMS non c'e' nessun campo per compilarlo: la redazione\n` +
        `     non ha modo di valorizzarlo.`
    );
  }
}

// --- Il campo data non deve reintrodurre il problema del fuso orario --------
const bloccoData = config.match(/name:\s*date[\s\S]{0,400}/);
if (!bloccoData) {
  problemi.push('Nel CMS non c\'e\' il campo "date".');
} else {
  if (!/date_format:\s*'YYYY-MM-DD'/.test(bloccoData[0])) {
    problemi.push("Il campo data del CMS non e' su date_format: 'YYYY-MM-DD'.");
  }
  if (!/time_format:\s*false/.test(bloccoData[0])) {
    problemi.push('Il campo data del CMS non ha time_format: false: con l\'orario la data puo\' slittare di un giorno.');
  }
  if (!/picker_utc:\s*false/.test(bloccoData[0])) {
    problemi.push('Il campo data del CMS non ha picker_utc: false: la data verrebbe scritta in UTC.');
  }
}

// --- Ramo e servizio di login ------------------------------------------------
const ramo = (config.match(/^\s*branch:\s*(\S+)\s*$/m) || [])[1];
const baseUrl = (config.match(/^\s*base_url:\s*(\S+)\s*$/m) || [])[1];
if (!ramo) problemi.push('Nella configurazione del CMS manca il ramo (branch).');
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  problemi.push('base_url del CMS mancante o non e\' un indirizzo: il login non potrebbe partire.');
}

// --- Esito -------------------------------------------------------------------
const elenco = (s) => [...s].sort().join(', ');
if (problemi.length === 0) {
  console.log(
    `verifica CMS: campi allineati (${elenco(campiSchema)}), data senza fuso, ` +
      `ramo "${ramo}", login su ${baseUrl}.`
  );
  process.exit(0);
}

console.error(`verifica CMS: ${problemi.length} problema/i.`);
console.error(`  campi nel CMS:    ${elenco(campiCms)}`);
console.error(`  campi nel sito:   ${elenco(campiSchema)}`);
for (const p of problemi) console.error(`  - ${p}`);
console.error(
  '\nLe due liste stanno in src/content.config.ts e src/pages/admin/config.yml.ts:\n' +
    'vanno cambiate insieme.'
);
process.exit(1);
