import type { RuntimeEnv } from '../../src/lib/supabase-server';

/**
 * Primo passo del login al CMS: manda su GitHub.
 *
 * Perche' esiste. Sveltia CMS con backend `github` ha bisogno di un servizio che
 * completi lo scambio OAuth, perche' il client secret non puo' stare nel
 * browser. Invece di appoggiarsi a un servizio di terzi, i due passaggi stanno
 * qui: sono due Pages Function di poche righe, il segreto resta nelle variabili
 * del progetto Cloudflare e non lascia mai il server.
 *
 * L'accesso al CMS non ha niente a che vedere con gli account membri: chi entra
 * qui si autentica su GitHub e scrive sul repository, non e' un iscritto e non
 * tocca Supabase.
 *
 * Lo `state` e' un valore casuale che torna indietro nel giro: serve a legare la
 * risposta di GitHub a questa richiesta, cosi' una richiesta preparata altrove
 * non puo' far concludere un login qui (CSRF). Viaggia in un cookie di sessione
 * HttpOnly, quindi il browser lo rimanda ma il JavaScript della pagina non lo
 * legge.
 */

type Ambiente = RuntimeEnv & {
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
};

export const COOKIE_STATO = 'cogu_cms_state';

function errore(messaggio: string, stato = 503): Response {
  return new Response(
    `<!doctype html><html lang="it"><meta charset="utf-8"><title>CMS non configurato</title>` +
      `<body style="font:16px/1.5 system-ui;margin:40px;max-width:60ch">` +
      `<h1 style="font-size:1.3rem">Accesso al CMS non disponibile</h1><p>${messaggio}</p></body></html>`,
    { status: stato, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
  );
}

export const onRequestGet: PagesFunction<Ambiente> = async (context) => {
  const { request, env } = context;

  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // Stesso principio del cancello dei pagamenti: se manca la configurazione si
    // risponde in modo controllato invece di provarci e fallire dentro GitHub.
    console.warn('[cms-auth] GITHUB_OAUTH_CLIENT_ID o GITHUB_OAUTH_CLIENT_SECRET non impostate');
    return errore(
      "Manca la configurazione OAuth di GitHub per questo ambiente. Chi amministra il sito trova le istruzioni in docs/redazione-cms.md."
    );
  }

  const origine = new URL(request.url).origin;
  const stato = crypto.randomUUID();

  const github = new URL('https://github.com/login/oauth/authorize');
  github.searchParams.set('client_id', clientId);
  github.searchParams.set('redirect_uri', `${origine}/api/cms-callback`);
  // Il permesso piu' piccolo che basta. `gattcocco/cognitariat` e' un repository
  // pubblico, e `public_repo` da' scrittura sui soli repository pubblici:
  // `repo`, che si usa di solito, darebbe accesso anche a tutti i repository
  // privati di chi fa il login — roba che con gli articoli non c'entra niente.
  // Se un giorno il repository diventasse privato, `public_repo` smetterebbe di
  // funzionare e servirebbe tornare a `repo`: e' l'unico caso in cui rialzarlo.
  github.searchParams.set('scope', 'public_repo');
  github.searchParams.set('state', stato);

  return new Response(null, {
    status: 302,
    headers: {
      location: github.href,
      'set-cookie': `${COOKIE_STATO}=${stato}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      'cache-control': 'no-store',
    },
  });
};
