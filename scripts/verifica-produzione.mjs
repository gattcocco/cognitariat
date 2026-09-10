/**
 * Collaudo di un sito pubblicato: dice se è configurato come produzione o come
 * anteprima, e se le due cose sono coerenti con quello che ci si aspetta.
 *
 * Serve due volte:
 *  - **prima** del cutover, puntandolo alla preview: deve dire «anteprima», con
 *    noindex e robots chiuso. Se dicesse «produzione» vorrebbe dire che una
 *    variabile è già sbagliata;
 *  - **dopo** il cutover, puntandolo al dominio vero: deve dire «produzione»,
 *    con canonical e sitemap sul dominio pubblico, robots aperto, e i pagamenti
 *    ancora spenti.
 *
 * Tutto in sola lettura: nessuna richiesta cambia niente. Le uniche POST sono ai
 * tre checkout, che devono rispondere 503 — se rispondessero altro sarebbe
 * esattamente il problema che si sta cercando.
 *
 * uso:
 *   node scripts/verifica-produzione.mjs <url> [--produzione] [--ramo-cms <nome>]
 *
 * esempi:
 *   node scripts/verifica-produzione.mjs https://dev.cognitariat.pages.dev
 *   node scripts/verifica-produzione.mjs https://cognitariatzone.org --produzione --ramo-cms main
 */

const argomenti = process.argv.slice(2);
const base = (argomenti[0] || '').trim().replace(/\/+$/, '');
const attesaProduzione = argomenti.includes('--produzione');
const ramoAtteso = (() => {
  const i = argomenti.indexOf('--ramo-cms');
  return i >= 0 ? argomenti[i + 1] : undefined;
})();

if (!base || !/^https?:\/\//.test(base)) {
  console.error(
    'Serve l\'indirizzo del sito da collaudare.\n' +
      '  node scripts/verifica-produzione.mjs https://dev.cognitariat.pages.dev\n' +
      '  node scripts/verifica-produzione.mjs https://cognitariatzone.org --produzione --ramo-cms main'
  );
  process.exit(2);
}

const problemi = [];
const righe = [];

function esito(etichetta, valore, ok) {
  righe.push({ etichetta, valore, ok });
}

async function testo(percorso) {
  const r = await fetch(`${base}${percorso}`, { redirect: 'follow' });
  return { stato: r.status, corpo: r.ok ? await r.text() : '' };
}

// --- Pagine ------------------------------------------------------------------
const home = await testo('/');
if (home.stato !== 200) {
  console.error(`La home ha risposto ${home.stato}: non si può collaudare.`);
  process.exit(2);
}

// --- Indicizzazione ----------------------------------------------------------
const robotsMeta = (home.corpo.match(/<meta name="robots" content="([^"]*)"/) || [])[1] ?? '(assente)';
const indicizzabile = /index/.test(robotsMeta) && !/noindex/.test(robotsMeta);
esito('meta robots', robotsMeta, attesaProduzione ? indicizzabile : !indicizzabile);

const robotsTxt = await testo('/robots.txt');
const robotsApre = /^\s*Allow:\s*\/\s*$/m.test(robotsTxt.corpo);
const robotsChiude = /^\s*Disallow:\s*\/\s*$/m.test(robotsTxt.corpo);
esito(
  'robots.txt',
  robotsChiude ? 'Disallow: / (chiuso)' : robotsApre ? 'Allow: / (aperto)' : '(non riconosciuto)',
  attesaProduzione ? robotsApre : robotsChiude
);

if (attesaProduzione) {
  const escludeAdmin = /^\s*Disallow:\s*\/admin\//m.test(robotsTxt.corpo);
  esito('robots.txt esclude /admin/', escludeAdmin ? 'sì' : 'no', escludeAdmin);
  const sitemapDichiarata = (robotsTxt.corpo.match(/^\s*Sitemap:\s*(\S+)/m) || [])[1];
  esito(
    'sitemap dichiarata',
    sitemapDichiarata ?? '(assente)',
    Boolean(sitemapDichiarata && sitemapDichiarata.startsWith(base))
  );
}

// --- Dominio dichiarato ------------------------------------------------------
/**
 * In produzione il dominio dichiarato deve essere esattamente quello che si sta
 * collaudando. Su un'anteprima no: Cloudflare dà a ogni deployment un indirizzo
 * diverso e il sito dichiara quello, mentre noi lo interroghiamo dall'alias di
 * ramo. Lì basta che non dichiari il dominio pubblico — quello sì sarebbe un
 * problema, perché vorrebbe dire che l'anteprima si spaccia per il sito vero.
 */
const dominioOk = (valore) =>
  attesaProduzione ? valore.startsWith(base) : /^https:\/\/[a-z0-9.-]+\.pages\.dev\//.test(valore);

const canonical = (home.corpo.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '(assente)';
esito('canonical della home', canonical, dominioOk(canonical));

const sitemap = await testo('/sitemap.xml');
const primaVoce = (sitemap.corpo.match(/<loc>([^<]*)<\/loc>/) || [])[1] ?? '(assente)';
esito('prima voce della sitemap', primaVoce, dominioOk(primaVoce));

// --- Bozze non pubblicate ----------------------------------------------------
const blog = await testo('/blog/');
// class="…card-articolo-bozza" e' un'etichetta renderizzata; ".card-articolo-bozza{"
// e' solo la regola CSS, che c'e' sempre.
const bozzeInElenco = /class="[^"]*card-articolo-bozza/.test(blog.corpo);
esito('bozze nell\'elenco', bozzeInElenco ? 'PRESENTI' : 'nessuna', !bozzeInElenco);

const sitemapConBozze = /bozza/i.test(sitemap.corpo);
esito('bozze nella sitemap', sitemapConBozze ? 'PRESENTI' : 'nessuna', !sitemapConBozze);

// --- CMS ---------------------------------------------------------------------
const config = await testo('/admin/config.yml');
const ramoCms = (config.corpo.match(/^\s*branch:\s*(\S+)\s*$/m) || [])[1];
const baseUrlCms = (config.corpo.match(/^\s*base_url:\s*(\S+)\s*$/m) || [])[1];
esito('ramo su cui scrive il CMS', ramoCms ?? '(assente)', ramoAtteso ? ramoCms === ramoAtteso : Boolean(ramoCms));
esito(
  'origine del login del CMS',
  baseUrlCms ?? '(assente)',
  Boolean(baseUrlCms) && baseUrlCms.replace(/\/+$/, '') === base
);

const auth = await fetch(`${base}/api/cms-auth`, { redirect: 'manual' });
esito(
  'login del CMS',
  auth.status === 302 ? 'configurato' : auth.status === 503 ? 'NON configurato' : `risposta ${auth.status}`,
  auth.status === 302
);

// --- Pagamenti: devono restare spenti ---------------------------------------
for (const endpoint of ['api/checkout', 'api/checkout-merch', 'api/checkout-sostenitore']) {
  const r = await fetch(`${base}/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  esito(`POST /${endpoint}`, String(r.status), r.status === 503);
}

// --- Stampa ------------------------------------------------------------------
console.log(`Collaudo di ${base} — atteso: ${attesaProduzione ? 'PRODUZIONE' : 'anteprima'}\n`);
const larghezza = Math.max(...righe.map((r) => r.etichetta.length));
for (const r of righe) {
  console.log(`  ${r.ok ? 'ok  ' : 'NO  '}${r.etichetta.padEnd(larghezza)}  ${r.valore}`);
  if (!r.ok) problemi.push(`${r.etichetta}: ${r.valore}`);
}

console.log('\n' + '-'.repeat(72));
if (problemi.length === 0) {
  console.log(
    attesaProduzione
      ? 'Configurazione di produzione coerente: dominio dichiarato, indicizzazione aperta,\nbozze fuori, CMS sul ramo giusto e pagamenti ancora spenti.'
      : 'Configurazione di anteprima coerente: non indicizzata, robots chiuso, bozze fuori\ne pagamenti spenti.'
  );
  process.exit(0);
}
console.log(`${problemi.length} punto/i da sistemare prima di considerarlo a posto:\n`);
problemi.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
console.log(
  '\nLe variabili che governano queste cose sono BRANCH_PRODUZIONE, SITO_PUBBLICO_URL,\n' +
    'CMS_BRANCH e le due dell\'OAuth: vedi docs/redazione-cms.md §8.'
);
process.exit(1);
