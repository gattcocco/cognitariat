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

/**
 * Campi che lo schema dichiara di proposito senza un corrispettivo nel CMS.
 * `cover` e `coverAlt` sono la forma vecchia della copertina: restano nello
 * schema solo per far fallire la build se un file e' rimasto indietro, non per
 * essere compilati. Nel CMS non devono esserci — se ci tornassero, i due modi
 * di scrivere la copertina convivrebbero e nessuno saprebbe quale vince.
 */
const SOLO_NEL_SITO = new Set(['cover', 'coverAlt']);

/**
 * Gruppi del CMS e i sottocampi che devono contenere. La copertina e' un gruppo
 * e non due campi affiancati perche' e' l'unico modo, in questa versione di
 * Sveltia, di rendere il testo alternativo obbligatorio *solo* quando c'e'
 * l'immagine: finche' la casella «Aggiungi Copertina» non e' spuntata i due
 * campi non esistono. Se qualcuno li riappiattisse, la descrizione tornerebbe
 * facoltativa senza che nessuno se ne accorga: e' quello che questo controllo
 * impedisce.
 */
const GRUPPI = { copertina: ['file', 'alt'] };

/**
 * Gruppi che devono essere **obbligatori** nel CMS, non solo presenti. Per la
 * copertina e' la decisione editoriale del 09/09/2026: ogni articolo ne ha una.
 * Se qualcuno rimettesse `required: false`, il CMS tornerebbe a mostrare la
 * casella «Aggiungi Copertina» e si potrebbe salvare un articolo senza — mentre
 * la build lo rifiuterebbe. Il salvataggio riuscirebbe e la pubblicazione no:
 * il modo peggiore di rompersi.
 */
const GRUPPI_OBBLIGATORI = ['copertina'];

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
  [...config.matchAll(/^\s{8}name:\s*([A-Za-z][A-Za-z0-9_]*)\s*$/gm)].map((m) => m[1])
);

// Sottocampi: piu' indentati, cioe' dentro un gruppo.
const sottocampiCms = [...config.matchAll(/^\s{12,}name:\s*([A-Za-z][A-Za-z0-9_]*)\s*$/gm)].map(
  (m) => m[1]
);

// --- Campi dichiarati nello schema del sito ---------------------------------
const corpoSchema = schema.slice(schema.indexOf('z.object({'));
const campiSchema = new Set(
  [...corpoSchema.matchAll(/^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*z\b/gm)].map((m) => m[1])
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
/**
 * Legge il `required:` dichiarato accanto a un `name:` di primo livello.
 * A mano e non con un'espressione regolare costruita al volo: la versione con
 * RegExp e template literal aveva perso i backslash e cercava `s{8}` invece di
 * spazi, quindi non trovava mai il blocco e dava sempre lo stesso allarme.
 * Righe indentate di 8 spazi = campo di primo livello; 12 = sottocampo.
 */
function requiredDelCampo(yaml, nome) {
  const righe = yaml.split('\n');
  const inizio = righe.findIndex((r) => r === `        name: ${nome}`);
  if (inizio === -1) return { trovato: false };
  for (let i = inizio + 1; i < righe.length; i += 1) {
    const r = righe[i];
    // Fine del blocco: un'altra voce di elenco allo stesso livello.
    if (/^ {6}- /.test(r)) break;
    const m = /^ {8}required:\s*(\S+)\s*$/.exec(r);
    if (m) return { trovato: true, valore: m[1] };
  }
  return { trovato: true, valore: undefined };
}

for (const gruppo of GRUPPI_OBBLIGATORI) {
  const { trovato, valore } = requiredDelCampo(config, gruppo);
  if (!trovato) {
    problemi.push(`Nel CMS non c'e' nessun campo "${gruppo}".`);
  } else if (valore === undefined) {
    problemi.push(`Nel CMS il gruppo "${gruppo}" non dichiara "required": deve essere obbligatorio.`);
  } else if (valore !== 'true') {
    problemi.push(
      `Nel CMS il gruppo "${gruppo}" ha required: ${valore}. Deve essere true: ogni articolo deve\n` +
        `     avere una copertina, e con required: false il CMS lascerebbe salvare senza mentre la\n` +
        `     build rifiuterebbe di pubblicare — il salvataggio riesce, la pubblicazione no.`
    );
  }
}

for (const [gruppo, attesi] of Object.entries(GRUPPI)) {
  if (!campiCms.has(gruppo)) continue;
  const mancanti = attesi.filter((c) => !sottocampiCms.includes(c));
  if (mancanti.length) {
    problemi.push(
      `Il gruppo "${gruppo}" del CMS non contiene ${mancanti.map((c) => `"${c}"`).join(' e ')}: ` +
        `lo schema del sito se li aspetta dentro quel gruppo.`
    );
  }
  const richiesti = [...config.matchAll(/^\s{12}name:\s*([A-Za-z][A-Za-z0-9_]*)[\s\S]{0,200}?^\s{12}required:\s*(\S+)/gm)];
  for (const c of attesi) {
    const riga = richiesti.find((m) => m[1] === c);
    if (!riga || riga[2] !== 'true') {
      problemi.push(
        `Nel gruppo "${gruppo}" il campo "${c}" non e' obbligatorio. E' proprio il punto del ` +
          `gruppo: quando la copertina c'e', servono tutte e due le parti.`
      );
    }
  }
}

for (const c of campiSchema) {
  if (SOLO_NEL_SITO.has(c)) {
    if (campiCms.has(c)) {
      problemi.push(
        `"${c}" e' la forma vecchia della copertina ed e' tornato nel CMS: i due modi di ` +
          `scriverla convivrebbero e nessuno saprebbe quale vince.`
      );
    }
    continue;
  }
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
