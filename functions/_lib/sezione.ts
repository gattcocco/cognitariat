import { SLUG_PER_SEZIONE } from '../../generato/slug-pagine';

/**
 * Un contenuto cancellato deve smettere di esistere.
 *
 * IL PROBLEMA, VERIFICATO L'08 E IL 09/09/2026 IN ANTEPRIMA E IN PRODUZIONE
 * Un articolo rimosso dal CMS restava leggibile al suo indirizzo, mentre tutto
 * il resto diceva che non c'era più: commit di cancellazione verde, deployment
 * verde, contenuto fuori dagli elenchi e fuori dal CMS, indirizzo specifico del
 * deployment 404, `cognitariat.pages.dev` 404, e lo **stesso** indirizzo sul
 * dominio pubblico con una query nuova 404. Solo l'indirizzo originale, senza
 * query, continuava a servire la pagina vecchia.
 *
 * Non era la cache del browser, e non era la cache della zona: *Purge
 * Everything* non l'ha rimossa, e Cloudflare Trace mostrava che la regola di
 * bypass veniva applicata e che l'origine rispondeva 404. La pagina veniva da
 * uno strato statico di Pages che le direttive dell'origine non governano — lo
 * stesso che in anteprima aveva ignorato `s-maxage=0`, `private` e `no-store`,
 * quest'ultimo servito con `CF-Cache-Status: HIT`.
 *
 * PERCHE' UN MIDDLEWARE
 * Perché è l'unico punto che sta **davanti** a quello strato. Una Function gira
 * prima che la richiesta possa essere soddisfatta da un asset: se rispondiamo
 * qui, quello che c'è dietro non viene nemmeno interrogato. Non è una pulizia
 * della cache — è non arrivarci.
 *
 * PERCHE' UN MODULO CONDIVISO
 * Perché /blog/ e /agenda/ hanno lo stesso problema e devono avere la stessa
 * risposta. Due implementazioni separate divergono: una viene corretta e
 * l'altra no, e il difetto torna solo su una delle due sezioni — il modo
 * peggiore, perché sembra risolto. I due middleware sono quattro righe che
 * passano il nome della sezione a questa funzione.
 *
 * L'elenco degli slug lo scrive la build (`scripts/genera-slug.mjs`) leggendo
 * `dist/`. Nessuna lista da mantenere a mano, nessun redirect, nessun
 * segnaposto per i contenuti cancellati: la redazione cancella e basta.
 */

/** La pagina di errore del sito, se si riesce a recuperarla; altrimenti un 404 essenziale. */
async function pagina404(request: Request): Promise<Response> {
  const intestazioni = {
    'content-type': 'text/html; charset=utf-8',
    // Perché questa risposta non venga conservata da nessuno: è il difetto da
    // cui nasce tutto il file. Un 404 in cache è un problema al contrario —
    // resterebbe attaccato a un indirizzo che un giorno tornerà valido.
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

/**
 * Decide se la richiesta riguarda uno slug di questa sezione e, in quel caso, se
 * quello slug esiste in questo deployment.
 *
 * Passa oltre senza guardare:
 *  - l'elenco della sezione (`/blog/`, `/agenda/`), che è una pagina e non uno slug;
 *  - qualunque percorso più profondo;
 *  - i file dentro la cartella della sezione (hanno un punto nel nome).
 */
export function decidi(
  pathname: string,
  sezione: string,
  /**
   * Elenco degli slug noti. Di norma viene da quello generato dalla build;
   * si passa esplicitamente nelle prove, che altrimenti dipenderebbero da
   * quanti contenuti ci sono oggi sul sito.
   */
  noti: ReadonlySet<string> | undefined = SLUG_PER_SEZIONE[sezione]
): { slug: string } | 'passa' {
  const re = new RegExp('^/' + sezione + '/([^/]+)/?$');
  const m = re.exec(pathname);
  if (!m) return 'passa';

  let slug: string;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    // Percorso codificato male: non è uno slug nostro, non è affare nostro.
    return 'passa';
  }

  if (slug.includes('.')) return 'passa';

  if (noti && noti.has(slug)) return 'passa';

  return { slug };
}

/** Il middleware di una sezione: quattro righe, e la decisione sta qui sopra. */
export function proteggi(sezione: string): PagesFunction {
  return async ({ request, next }) => {
    const { pathname } = new URL(request.url);
    if (decidi(pathname, sezione) === 'passa') return next();
    return pagina404(request);
  };
}
