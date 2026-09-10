/**
 * Tiene insieme le due meta' dello stesso contratto: i campi che il CMS fa
 * compilare alla redazione e i campi che il sito si aspetta di trovare.
 *
 * Se qualcuno aggiunge un campo allo schema e si dimentica del CMS, la redazione
 * non ha modo di compilarlo. Se lo aggiunge al CMS e si dimentica dello schema,
 * la build fallisce dopo che il contenuto e' gia' stato salvato: l'errore compare
 * a chi non l'ha causato, mezz'ora dopo, e sembra che il sito sia rotto.
 *
 * Dal 09/09/2026 le collection sono due, articoli e agenda, e il controllo gira
 * su entrambe: era il momento in cui un difetto poteva nascondersi nella seconda
 * mentre la prima restava a posto.
 *
 * Si controllano anche i campi data. Devono restare senza fuso (`picker_utc:
 * false`) e con un formato dichiarato: con l'orario in UTC, una data scritta il 6
 * settembre puo' comparire sul sito come 5 settembre, e le 19:00 di Milano
 * diventano le 21:00. E' un errore che nessuno collega alla configurazione del
 * CMS.
 *
 * Uso: node scripts/verifica-cms.mjs   (dopo `npm run build`)
 */
import { readFile } from 'node:fs/promises';

const CONFIG = 'dist/admin/config.yml';
const SCHEMA = 'src/content.config.ts';

const problemi = [];

/**
 * Le collection, con quello che ci si aspetta da ciascuna.
 *
 * - `variabile`: come si chiama nello schema Astro (`const articles = …`);
 * - `soloNelCms`: campi che esistono solo nel modulo (il corpo Markdown sta nel
 *   file, non nel frontmatter);
 * - `soloNelSito`: campi che lo schema dichiara di proposito senza corrispettivo
 *   nel CMS. `cover` e `coverAlt` sono la forma vecchia della copertina: restano
 *   solo per far fallire la build se un file e' rimasto indietro. Se tornassero
 *   nel CMS, i due modi di scrivere la copertina convivrebbero e nessuno saprebbe
 *   quale vince;
 * - `gruppi`: i sottocampi attesi dentro un campo `object`;
 * - `gruppiObbligatori`: i gruppi che devono avere `required: true`. Per la
 *   copertina e' la decisione editoriale del 09/09/2026: ogni contenuto ne ha
 *   una. Con `required: false` il CMS lascerebbe salvare senza, mentre la build
 *   rifiuterebbe di pubblicare — il salvataggio riesce e la pubblicazione no, il
 *   modo peggiore di rompersi;
 * - `date`: campi data e cosa devono dichiarare.
 */
const COLLECTION = {
  articles: {
    variabile: 'articles',
    soloNelCms: ['body'],
    soloNelSito: ['cover', 'coverAlt'],
    gruppi: { copertina: ['file', 'alt'] },
    gruppiObbligatori: ['copertina'],
    date: {
      date: { date_format: "'YYYY-MM-DD'", time_format: 'false', picker_utc: 'false' },
    },
  },
  eventi: {
    variabile: 'eventi',
    soloNelCms: ['body'],
    soloNelSito: [],
    gruppi: { copertina: ['file', 'alt'], linkEsterno: ['url', 'etichetta'] },
    gruppiObbligatori: ['copertina'],
    date: {
      // Qui l'ora serve — un appuntamento ha un orario — ma il fuso no: la
      // stringa resta 'AAAA-MM-GGTHH:mm' e la interpreta src/lib/eventi.ts.
      inizio: { date_format: "'YYYY-MM-DD'", time_format: "'HH:mm'", picker_utc: 'false' },
      fine: { date_format: "'YYYY-MM-DD'", time_format: "'HH:mm'", picker_utc: 'false' },
    },
  },
};

let config;
try {
  config = await readFile(CONFIG, 'utf8');
} catch {
  console.error(`Manca ${CONFIG}: esegui prima "npm run build".`);
  process.exit(1);
}
const schema = await readFile(SCHEMA, 'utf8');

/** Il blocco YAML di una collection: da `- name: x` fino alla successiva allo stesso livello. */
function bloccoCms(nome) {
  const righe = config.split('\n');
  const inizio = righe.findIndex((r) => r === `  - name: ${nome}`);
  if (inizio === -1) return undefined;
  const fine = righe.findIndex((r, i) => i > inizio && /^ {2}- name: /.test(r));
  return righe.slice(inizio, fine === -1 ? righe.length : fine).join('\n');
}

/** Il blocco TypeScript di una collection: da `const x = defineCollection({` a `});`. */
function bloccoSchema(variabile) {
  const i = schema.indexOf(`const ${variabile} = defineCollection({`);
  if (i === -1) return undefined;
  const j = schema.indexOf('\n});', i);
  return schema.slice(i, j === -1 ? schema.length : j);
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
    if (/^ {6}- /.test(righe[i])) break;
    const m = /^ {8}required:\s*(\S+)\s*$/.exec(righe[i]);
    if (m) return { trovato: true, valore: m[1] };
  }
  return { trovato: true, valore: undefined };
}

/** Le chiavi dichiarate accanto a un `name:` di sottocampo (12 spazi). */
function chiaviSottocampo(yaml, nome) {
  const righe = yaml.split('\n');
  const inizio = righe.findIndex((r) => r === `            name: ${nome}`);
  if (inizio === -1) return undefined;
  const fuori = {};
  for (let i = inizio + 1; i < righe.length; i += 1) {
    if (/^ {10}- /.test(righe[i]) || /^ {6}- /.test(righe[i])) break;
    const m = /^ {12}([a-z_]+):\s*(\S.*?)\s*$/.exec(righe[i]);
    if (m) fuori[m[1]] = m[2];
  }
  return fuori;
}

/** Le chiavi dichiarate accanto a un `name:` di primo livello (8 spazi). */
function chiaviCampo(yaml, nome) {
  const righe = yaml.split('\n');
  const inizio = righe.findIndex((r) => r === `        name: ${nome}`);
  if (inizio === -1) return undefined;
  const fuori = {};
  for (let i = inizio + 1; i < righe.length; i += 1) {
    if (/^ {6}- /.test(righe[i])) break;
    const m = /^ {8}([a-z_]+):\s*(\S.*?)\s*$/.exec(righe[i]);
    if (m) fuori[m[1]] = m[2];
  }
  return fuori;
}

const riepilogo = {};

for (const [nome, atteso] of Object.entries(COLLECTION)) {
  const yaml = bloccoCms(nome);
  const ts = bloccoSchema(atteso.variabile);

  if (!yaml) {
    problemi.push(`Nel CMS non c'e' la collection "${nome}".`);
    continue;
  }
  if (!ts) {
    problemi.push(`Nello schema del sito non c'e' la collection "${atteso.variabile}".`);
    continue;
  }

  const campiCms = new Set(
    [...yaml.matchAll(/^\s{8}name:\s*([A-Za-z][A-Za-z0-9_]*)\s*$/gm)].map((m) => m[1])
  );
  const sottocampiCms = [...yaml.matchAll(/^\s{12}name:\s*([A-Za-z][A-Za-z0-9_]*)\s*$/gm)].map(
    (m) => m[1]
  );
  // Un campo dello schema e' una riga indentata di 4 spazi che assegna o `z.…`
  // o una chiamata di funzione: `inizio: momentoScritto()` e' un campo quanto
  // `title: z.string()`, e cercare solo `z` lo faceva sparire dall'elenco —
  // con il risultato che il controllo accusava il CMS di avere un campo in piu'.
  const campiSchema = new Set(
    [...ts.matchAll(/^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*(?:z\b|[A-Za-z_$][\w$]*\()/gm)].map((m) => m[1])
  );

  riepilogo[nome] = campiSchema;

  if (campiCms.size === 0) problemi.push(`Nessun campo trovato per "${nome}" in ${CONFIG}.`);
  if (campiSchema.size === 0) problemi.push(`Nessun campo trovato per "${nome}" in ${SCHEMA}.`);

  const soloNelCms = new Set(atteso.soloNelCms);
  const soloNelSito = new Set(atteso.soloNelSito);

  for (const c of campiCms) {
    if (!campiSchema.has(c) && !soloNelCms.has(c)) {
      problemi.push(
        `[${nome}] Il CMS fa compilare "${c}", ma lo schema del sito non lo conosce: quello che\n` +
          `     scrive la redazione verrebbe ignorato, o farebbe fallire la build.`
      );
    }
  }

  for (const c of campiSchema) {
    if (soloNelSito.has(c)) {
      if (campiCms.has(c)) {
        problemi.push(
          `[${nome}] "${c}" e' la forma vecchia della copertina ed e' tornato nel CMS: i due modi\n` +
            `     di scriverla convivrebbero e nessuno saprebbe quale vince.`
        );
      }
      continue;
    }
    if (!campiCms.has(c)) {
      problemi.push(
        `[${nome}] Lo schema prevede "${c}", ma nel CMS non c'e' nessun campo per compilarlo: la\n` +
          `     redazione non ha modo di valorizzarlo.`
      );
    }
  }

  // --- Gruppi: sottocampi presenti e obbligatori ------------------------------
  for (const [gruppo, sottocampi] of Object.entries(atteso.gruppi)) {
    if (!campiCms.has(gruppo)) continue;
    const mancanti = sottocampi.filter((c) => !sottocampiCms.includes(c));
    if (mancanti.length) {
      problemi.push(
        `[${nome}] Il gruppo "${gruppo}" non contiene ${mancanti.map((c) => `"${c}"`).join(' e ')}: ` +
          `lo schema del sito se li aspetta dentro quel gruppo.`
      );
    }
    for (const c of sottocampi) {
      const chiavi = chiaviSottocampo(yaml, c);
      if (!chiavi) continue;
      if (chiavi.required !== 'true') {
        problemi.push(
          `[${nome}] Nel gruppo "${gruppo}" il campo "${c}" non e' obbligatorio (required: ` +
            `${chiavi.required ?? 'assente'}). E' il punto del gruppo: se c'e', servono tutte le parti.`
        );
      }
    }
  }

  for (const gruppo of atteso.gruppiObbligatori) {
    const { trovato, valore } = requiredDelCampo(yaml, gruppo);
    if (!trovato) {
      problemi.push(`[${nome}] Nel CMS non c'e' nessun campo "${gruppo}".`);
    } else if (valore === undefined) {
      problemi.push(
        `[${nome}] Il gruppo "${gruppo}" non dichiara "required": deve essere obbligatorio.`
      );
    } else if (valore !== 'true') {
      problemi.push(
        `[${nome}] Il gruppo "${gruppo}" ha required: ${valore}. Deve essere true: ogni contenuto\n` +
          `     deve avere una copertina, e con required: false il CMS lascerebbe salvare senza\n` +
          `     mentre la build rifiuterebbe di pubblicare.`
      );
    }
  }

  // --- Campi data: niente fusi, niente slittamenti ----------------------------
  for (const [campo, atteseChiavi] of Object.entries(atteso.date)) {
    const chiavi = chiaviCampo(yaml, campo);
    if (!chiavi) {
      problemi.push(`[${nome}] Nel CMS non c'e' il campo "${campo}".`);
      continue;
    }
    for (const [chiave, valore] of Object.entries(atteseChiavi)) {
      if (chiavi[chiave] !== valore) {
        problemi.push(
          `[${nome}] Il campo "${campo}" ha ${chiave}: ${chiavi[chiave] ?? 'assente'}, atteso ` +
            `${valore}. Senza, la data puo' slittare di un giorno e l'ora di un'ora o due.`
        );
      }
    }
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
  const righe = Object.entries(riepilogo)
    .map(([nome, campi]) => `  ${nome}: ${elenco(campi)}`)
    .join('\n');
  console.log(
    `verifica CMS: campi allineati su ${Object.keys(riepilogo).length} collection,\n${righe}\n` +
      `  date senza fuso, ramo "${ramo}", login su ${baseUrl}.`
  );
  process.exit(0);
}

console.error(`verifica CMS: ${problemi.length} problema/i.`);
for (const p of problemi) console.error(`  - ${p}`);
console.error(
  '\nLe due liste stanno in src/content.config.ts e src/pages/admin/config.yml.ts:\n' +
    'vanno cambiate insieme.'
);
process.exit(1);
