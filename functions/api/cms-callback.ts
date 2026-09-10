import type { RuntimeEnv } from '../../src/lib/supabase-server';
import { COOKIE_STATO } from './cms-auth';

/**
 * Secondo passo del login al CMS: scambia il codice con un token e lo consegna
 * alla finestra che ha aperto il login.
 *
 * Il protocollo e' quello che si aspettano Sveltia e Decap: la finestra di
 * login manda al proprio opener prima "authorizing:github", poi
 * "authorization:github:success:<json>". Il token vive solo nel browser di chi
 * ha fatto il login; non passa da nessun nostro archivio.
 *
 * Due cautele che non sono decorative:
 *  - il postMessage e' indirizzato alla NOSTRA origine, non a "*". Con "*" il
 *    token verrebbe consegnato a qualunque pagina fosse riuscita ad aprire
 *    questa finestra;
 *  - niente token nei log. Gli errori si registrano per tipo, mai con il corpo
 *    della risposta di GitHub, che contiene la credenziale.
 */

type Ambiente = RuntimeEnv & {
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
};

/** Pagina che parla con la finestra del CMS e poi si chiude. */
function paginaRisposta(origine: string, messaggio: string): Response {
  const html = `<!doctype html>
<html lang="it">
<meta charset="utf-8">
<title>Accesso al CMS</title>
<body style="font:16px/1.5 system-ui;margin:40px">
<p>Accesso in corso… puoi chiudere questa finestra.</p>
<script>
(function () {
  var origine = ${JSON.stringify(origine)};
  var messaggio = ${JSON.stringify(messaggio)};
  function invia() {
    if (!window.opener) return;
    window.opener.postMessage('authorizing:github', origine);
    window.opener.postMessage(messaggio, origine);
  }
  // Il CMS risponde al primo messaggio dichiarandosi pronto; si riprova qualche
  // volta perche' la finestra che ha aperto il login puo' non essere ancora in
  // ascolto nell'istante esatto in cui questa pagina si carica.
  window.addEventListener('message', function (e) {
    if (e.origin === origine) invia();
  });
  invia();
  var tentativi = 0;
  var t = setInterval(function () {
    invia();
    if (++tentativi > 10) clearInterval(t);
  }, 250);
})();
</script>
</body></html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function fallimento(origine: string, motivo: string): Response {
  return paginaRisposta(
    origine,
    'authorization:github:error:' + JSON.stringify({ message: motivo })
  );
}

export const onRequestGet: PagesFunction<Ambiente> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const origine = url.origin;

  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('[cms-callback] configurazione OAuth assente');
    return fallimento(origine, 'CMS non configurato su questo ambiente.');
  }

  const codice = url.searchParams.get('code');
  const statoRicevuto = url.searchParams.get('state');
  if (!codice) {
    return fallimento(origine, 'GitHub non ha restituito nessun codice.');
  }

  // Confronto dello state con quello messo nel cookie all'andata.
  const cookie = request.headers.get('cookie') ?? '';
  const statoAtteso = (cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_STATO}=([^;]+)`)) || [])[1];
  if (!statoAtteso || !statoRicevuto || statoAtteso !== statoRicevuto) {
    console.warn('[cms-callback] state non corrispondente: login rifiutato');
    return fallimento(origine, 'Sessione di login non valida. Riprova dal pulsante di accesso.');
  }

  let token: string | undefined;
  try {
    const risposta = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: codice,
        redirect_uri: `${origine}/api/cms-callback`,
      }),
    });
    const dati = (await risposta.json()) as { access_token?: string; error?: string };
    if (dati.error || !dati.access_token) {
      // Si registra il tipo di errore, mai il corpo: conterrebbe la credenziale.
      console.warn(`[cms-callback] GitHub ha rifiutato lo scambio: ${dati.error ?? 'risposta senza token'}`);
      return fallimento(origine, 'GitHub non ha completato l\'accesso. Riprova.');
    }
    token = dati.access_token;
  } catch {
    console.warn('[cms-callback] scambio del codice fallito per errore di rete');
    return fallimento(origine, 'Non siamo riusciti a contattare GitHub. Riprova fra poco.');
  }

  const risposta = paginaRisposta(
    origine,
    'authorization:github:success:' + JSON.stringify({ token, provider: 'github' })
  );
  // Il cookie di state ha esaurito il suo scopo: si cancella subito.
  risposta.headers.append(
    'set-cookie',
    `${COOKIE_STATO}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
  return risposta;
};
