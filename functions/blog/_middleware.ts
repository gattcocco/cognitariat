import { SLUG_ARTICOLI } from '../../generato/slug-articoli';

/**
 * Un articolo cancellato deve smettere di esistere.
 *
 * IL PROBLEMA, VERIFICATO IL 09/09/2026 SUL DOMINIO PUBBLICO
 * Un articolo rimosso dal CMS restava leggibile al suo indirizzo, mentre tutto il
 * resto diceva che non c'era piu': il commit di cancellazione verde, il
 * deployment verde, l'articolo fuori dal blog roll e fuori dal CMS, l'indirizzo
 * specifico del deployment 404, `cognitariat.pages.dev` 404, e lo **stesso**
 * indirizzo sul dominio pubblico con una query nuova 404. Solo l'indirizzo
 * originale, senza query, continuava a servire la pagina vecchia.
 *
 * Non era la cache del browser, e non era la cache della zona: *Purge Everything*
 * non l'ha rimossa, e Cloudflare Trace mostrava che la regola di bypass veniva
 * applicata e che l'origine rispondeva 404. La pagina veniva quindi da uno strato
 * statico di Pages che le direttive dell'origine non governano — lo stesso che in
 * anteprima aveva ignorato `s-maxage=0`, `private` e `no-store`.
 *
 * PERCHE' UN MIDDLEWARE
 * Perche' e' l'unico punto che sta **davanti** a quello strato. Una Function gira
 * prima che la richiesta possa essere soddisfatta da un asset: se rispondiamo
 * qui, quello che c'e' dietro non viene nemmeno interrogato. Non e' una pulizia
 * della cache — e' non arrivarci.
 *
 * COSA FA, E COSA NON TOCCA
 * Solo `/blog/<qualcosa>`: se quel qualcosa non e' fra le pagine costruite in
 * questo deployment, risponde 404 con `Cache-Control: no-store`. Tutto il resto
 * passa con `next()` senza essere guardato:
 *
 *  - `/blog/` — l'elenco: e' una pagina costruita, non uno slug;
 *  - gli articoli veri, bozze comprese quando la build le include (l'elenco
 *    viene dalle cartelle prodotte, quindi le contiene o non le contiene
 *    esattamente come il sito);
 *  - le copertine, che stanno sotto `/images/articoli/`, non sotto `/blog/`;
 *  - sitemap, canonical, metadati: fuori da questo percorso;
 *  - `/admin/` e le rotte OAuth: fuori da questo percorso;
 *  - i file dentro una cartella di articolo, se un giorno ce ne fossero.
 *
 * L'elenco lo scrive la build (`scripts/genera-slug-articoli.mjs`) leggendo
 * `dist/blog/`. Nessuna lista da mantenere a mano, nessun redirect, nessun
 * segnaposto per gli articoli cancellati: la redazione cancella e basta.
 */

/** La pagina di errore del sito, se c'e'; altrimenti un 404 essenziale. */
async function pagina404(request: Request, next: () => Promise<Response>): Promise<Response> {
  const intestazioni = {
    'content-type': 'text/html; charset=utf-8',
    // Perche' questa risposta non venga conservata da nessuno: e' il difetto da
    // cui nasce tutto il file. Un 404 in cache e' un problema al contrario —
    // resterebbe attaccato a un indirizzo che un giorno tornera' valido.
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
  };

  try {
    const url = new URL(request.url);
    url.pathname = '/404.html';
    url.search = '';
    const risposta = await fetch(new Request(url.toString(), { headers: request.headers }));
    if (risposta.ok) {
      return new Response(await risposta.text(), { status: 404, headers: intestazioni });
    }
  } catch {
    // Se la pagina di errore non si recupera, meglio un 404 spoglio che un 500.
  }

  return new Response(
    '<!doctype html><html lang="it"><head><meta charset="utf-8">' +
      '<title>Pagina non trovata</title></head><body><h1>Questa pagina non c\'e\'</h1></body></html>',
    { status: 404, headers: intestazioni }
  );
}

export const onRequest: PagesFunction = async ({ request, next }) => {
  const { pathname } = new URL(request.url);

  // Tutto cio' che non e' esattamente /blog/<slug> o /blog/<slug>/ non ci riguarda:
  // l'elenco (/blog/), e qualunque percorso piu' profondo.
  const corrispondenza = /^\/blog\/([^/]+)\/?$/.exec(pathname);
  if (!corrispondenza) return next();

  const slug = decodeURIComponent(corrispondenza[1]);

  // I file serviti direttamente da /blog/ (per esempio /blog/index.html) non sono
  // slug di articoli: lasciamoli passare, li risolve chi sa farlo.
  if (slug.includes('.')) return next();

  if (SLUG_ARTICOLI.has(slug)) return next();

  return pagina404(request, next);
};
