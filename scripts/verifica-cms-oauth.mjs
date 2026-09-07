/**
 * Collaudo del login al CMS su un sito gia' pubblicato.
 *
 * Serve dopo aver creato l'applicazione OAuth su GitHub e impostato le variabili
 * su Cloudflare (docs/redazione-cms.md §4): dice in un colpo solo se il giro e'
 * configurato bene, senza dover provare a mano e senza toccare niente.
 *
 * Fa due richieste in lettura:
 *  - GET /admin/config.yml, per vedere su quale ramo scrive il CMS e verso quale
 *    origine manda il login;
 *  - GET /api/cms-auth **senza seguire il redirect**, per leggere dove
 *    manderebbe e con quali parametri. Non completa nessun accesso e non arriva
 *    mai a GitHub.
 *
 * Non stampa segreti: del client id mostra solo le prime lettere, e il client
 * secret non compare mai da nessuna parte perche' non lascia il server.
 *
 * uso: node scripts/verifica-cms-oauth.mjs https://dev.cognitariat.pages.dev
 */

const base = (process.argv[2] || '').trim().replace(/\/+$/, '');
if (!base || !/^https?:\/\//.test(base)) {
  console.error('Serve l\'indirizzo del sito da controllare.\n' + 'esempio: node scripts/verifica-cms-oauth.mjs https://dev.cognitariat.pages.dev');
  process.exit(2);
}

const problemi = [];
const note = [];

// --- 1. Configurazione servita al CMS ---------------------------------------
let config = '';
try {
  const r = await fetch(`${base}/admin/config.yml`);
  if (!r.ok) problemi.push(`GET /admin/config.yml ha risposto ${r.status}.`);
  else config = await r.text();
} catch (e) {
  console.error(`Non riesco a contattare ${base}: ${e.message}`);
  process.exit(2);
}

const ramo = (config.match(/^\s*branch:\s*(\S+)\s*$/m) || [])[1];
const baseUrl = (config.match(/^\s*base_url:\s*(\S+)\s*$/m) || [])[1];

console.log('CONFIGURAZIONE SERVITA AL CMS');
console.log(`  ramo su cui scrive        ${ramo ?? '(assente)'}`);
console.log(`  origine del login         ${baseUrl ?? '(assente)'}`);

if (baseUrl && baseUrl.replace(/\/+$/, '') !== base) {
  problemi.push(
    `base_url (${baseUrl}) non coincide con l'indirizzo che stai collaudando (${base}).\n` +
      `     Il giro del login tornerebbe su un altro indirizzo. Si imposta con CMS_AUTH_BASE_URL,\n` +
      `     e va puntata all'alias stabile del ramo, non all'URL del singolo deployment.`
  );
}

// --- 2. Avvio del login ------------------------------------------------------
console.log('\nAVVIO DEL LOGIN (GET /api/cms-auth, senza seguire il redirect)');
const r = await fetch(`${base}/api/cms-auth`, { redirect: 'manual' });
console.log(`  risposta                  ${r.status}`);

if (r.status === 503) {
  console.log('  lettura                   OAuth non ancora configurato su questo ambiente.');
  console.log(
    '\nDa fare, una volta sola, da chi amministra l\'account (docs/redazione-cms.md §4):\n' +
      '  1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App\n' +
      `     Homepage URL:              ${base}\n` +
      `     Authorization callback URL: ${base}/api/cms-callback\n` +
      '  2. Genera il client secret e copialo (GitHub non lo rimostra).\n' +
      '  3. Cloudflare → progetto Pages → Variables:\n' +
      '     GITHUB_OAUTH_CLIENT_ID      (in chiaro)\n' +
      '     GITHUB_OAUTH_CLIENT_SECRET  (cifrata)\n' +
      `     CMS_AUTH_BASE_URL           ${base}\n` +
      '     CMS_BRANCH                  dev\n' +
      '  4. Nuovo deploy: le variabili si leggono al build.\n' +
      '\nPoi rilancia questo comando: deve rispondere 302.'
  );
  process.exit(1);
}

if (r.status !== 302) {
  problemi.push(`Attesa una redirezione 302 verso GitHub, ricevuto ${r.status}.`);
} else {
  const location = r.headers.get('location') ?? '';
  let url;
  try {
    url = new URL(location);
  } catch {
    problemi.push('La redirezione non contiene un indirizzo valido.');
  }

  if (url) {
    const clientId = url.searchParams.get('client_id') ?? '';
    const scope = url.searchParams.get('scope') ?? '';
    const redirect = url.searchParams.get('redirect_uri') ?? '';
    const stato = url.searchParams.get('state') ?? '';

    console.log(`  destinazione              ${url.origin}${url.pathname}`);
    console.log(`  client id                 ${clientId ? clientId.slice(0, 4) + '…' : '(assente)'}`);
    console.log(`  permesso richiesto        ${scope || '(assente)'}`);
    console.log(`  ritorno previsto          ${redirect || '(assente)'}`);
    console.log(`  state                     ${stato ? 'presente' : '(assente)'}`);

    if (url.origin !== 'https://github.com' || url.pathname !== '/login/oauth/authorize') {
      problemi.push(`La redirezione non punta all'autorizzazione di GitHub ma a ${url.origin}${url.pathname}.`);
    }
    if (!clientId) problemi.push('Manca il client_id: la variabile GITHUB_OAUTH_CLIENT_ID non e\' arrivata al build.');
    if (scope !== 'public_repo') {
      problemi.push(
        `Il permesso richiesto e' "${scope}" invece di "public_repo". Va bene solo se il repository\n` +
          `     e' diventato privato: in tutti gli altri casi e' piu' largo del necessario.`
      );
    }
    if (redirect !== `${base}/api/cms-callback`) {
      problemi.push(
        `Il ritorno previsto e' ${redirect}, ma dovrebbe essere ${base}/api/cms-callback.\n` +
          `     Deve coincidere anche con il callback registrato nell'applicazione OAuth su GitHub.`
      );
    }
    if (!stato) problemi.push('Manca il parametro state: senza, il giro non e\' protetto da richieste preparate altrove.');
  }

  const cookie = r.headers.get('set-cookie') ?? '';
  const attributi = ['HttpOnly', 'Secure', 'SameSite=Lax'];
  const mancanti = attributi.filter((a) => !new RegExp(a, 'i').test(cookie));
  console.log(`  cookie di stato           ${cookie ? attributi.filter((a) => !mancanti.includes(a)).join(', ') : '(assente)'}`);
  if (!cookie) problemi.push('Il cookie di stato non viene impostato.');
  else if (mancanti.length) problemi.push(`Al cookie di stato mancano gli attributi: ${mancanti.join(', ')}.`);
}

// --- Esito -------------------------------------------------------------------
console.log('\n' + '-'.repeat(72));
for (const n of note) console.log(`nota: ${n}`);
if (problemi.length === 0) {
  console.log('Login del CMS configurato correttamente.');
  console.log('Resta da provare a mano l\'accesso vero: aprire /admin/, «Sign In with GitHub»,');
  console.log('creare una bozza, salvarla e verificare che il commit arrivi sul ramo indicato sopra.');
  process.exit(0);
}
console.log(`${problemi.length} problema/i:\n`);
problemi.forEach((p, i) => console.log(`  ${i + 1}.  ${p}\n`));
process.exit(1);
