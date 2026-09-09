import { strict as assert } from 'node:assert';
import { test } from 'node:test';

/**
 * Prove sul middleware di /blog/ (functions/blog/_middleware.ts): quello che sta
 * davanti allo strato statico di Pages e decide se un indirizzo di articolo
 * esiste ancora.
 *
 * L'elenco degli slug e' un modulo generato dalla build, quindi qui non si
 * importa il middleware vero — importerebbe l'elenco reale, e la prova
 * dipenderebbe da quanti articoli ci sono oggi. Si ricostruisce invece la stessa
 * decisione con un elenco fissato, cosi' i casi sono stabili: un articolo che
 * c'e', uno che non c'e' mai stato, uno cancellato.
 *
 * Il codice sotto prova va tenuto uguale a quello del middleware. E' poco — una
 * espressione regolare e tre condizioni — e in cambio le prove non hanno bisogno
 * di una build per girare.
 */

const SLUG_ARTICOLI: ReadonlySet<string> = new Set([
  'manifesto-cognitario-contro-oligarchia-ai',
  'un-altro-articolo-vero',
]);

type Esito = { tipo: 'passa' } | { tipo: 'risposta'; risposta: Response };

async function middleware(url: string): Promise<Esito> {
  const { pathname } = new URL(url);
  const corrispondenza = /^\/blog\/([^/]+)\/?$/.exec(pathname);
  if (!corrispondenza) return { tipo: 'passa' };

  const slug = decodeURIComponent(corrispondenza[1]);
  if (slug.includes('.')) return { tipo: 'passa' };
  if (SLUG_ARTICOLI.has(slug)) return { tipo: 'passa' };

  return {
    tipo: 'risposta',
    risposta: new Response('<h1>Questa pagina non c\'e\'</h1>', {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    }),
  };
}

const B = 'https://cognitariatzone.org';

test('articolo valido: passa al sito, il middleware non si mette in mezzo', async () => {
  for (const u of [
    `${B}/blog/manifesto-cognitario-contro-oligarchia-ai/`,
    `${B}/blog/manifesto-cognitario-contro-oligarchia-ai`,
    `${B}/blog/un-altro-articolo-vero/`,
  ]) {
    const esito = await middleware(u);
    assert.equal(esito.tipo, 'passa', `avrebbe dovuto passare: ${u}`);
  }
});

test('slug mai esistito: 404 vero, non una pagina di errore con stato 200', async () => {
  const esito = await middleware(`${B}/blog/non-e-mai-esistito/`);
  assert.equal(esito.tipo, 'risposta');
  if (esito.tipo !== 'risposta') return;
  assert.equal(esito.risposta.status, 404);
});

test('articolo eliminato: lo stesso indirizzo che prima funzionava risponde 404', async () => {
  // Era in elenco fino al deployment precedente; dopo la cancellazione non c'e'.
  const slug = 'prova-cache-produzione-da-eliminare';
  assert.equal(SLUG_ARTICOLI.has(slug), false, 'la premessa: lo slug non e\' piu\' fra i pubblicati');

  const esito = await middleware(`${B}/blog/${slug}/`);
  assert.equal(esito.tipo, 'risposta');
  if (esito.tipo !== 'risposta') return;
  assert.equal(esito.risposta.status, 404);
});

test('la risposta mancante non va conservata da nessuno: Cache-Control no-store', async () => {
  const esito = await middleware(`${B}/blog/inesistente/`);
  assert.equal(esito.tipo, 'risposta');
  if (esito.tipo !== 'risposta') return;
  assert.equal(esito.risposta.headers.get('cache-control'), 'no-store');
  assert.equal(esito.risposta.headers.get('x-robots-tag'), 'noindex');
  assert.match(esito.risposta.headers.get('content-type') ?? '', /text\/html/);
});

test('l\'elenco del blog non viene toccato', async () => {
  for (const u of [`${B}/blog/`, `${B}/blog`]) {
    const esito = await middleware(u);
    assert.equal(esito.tipo, 'passa', `l'elenco deve passare: ${u}`);
  }
});

test('percorsi piu\' profondi e file dentro /blog/ passano', async () => {
  for (const u of [
    `${B}/blog/index.html`,
    `${B}/blog/manifesto-cognitario-contro-oligarchia-ai/immagine.webp`,
    `${B}/blog/qualcosa/di/profondo/`,
  ]) {
    const esito = await middleware(u);
    assert.equal(esito.tipo, 'passa', `non doveva essere intercettato: ${u}`);
  }
});

test('fuori da /blog/ il middleware non esiste: home, privacy, admin, OAuth, copertine', async () => {
  for (const u of [
    `${B}/`,
    `${B}/privacy/`,
    `${B}/sitemap.xml`,
    `${B}/robots.txt`,
    `${B}/admin/`,
    `${B}/admin/config.yml`,
    `${B}/api/cms-auth`,
    `${B}/api/cms-callback?code=x`,
    `${B}/images/articoli/manifesto-cognitario-contro-oligarchia-ai.webp`,
  ]) {
    const esito = await middleware(u);
    assert.equal(esito.tipo, 'passa', `non doveva essere intercettato: ${u}`);
  }
});

test('la query string non cambia la decisione: conta il percorso', async () => {
  const conQuery = await middleware(`${B}/blog/non-esiste/?v=123`);
  assert.equal(conQuery.tipo, 'risposta');
  const validoConQuery = await middleware(`${B}/blog/un-altro-articolo-vero/?utm=x`);
  assert.equal(validoConQuery.tipo, 'passa');
});

test('uno slug con caratteri codificati viene confrontato decodificato', async () => {
  // %2D e' un trattino: non deve diventare un 404 per un articolo che esiste.
  const esito = await middleware(`${B}/blog/un%2Daltro%2Darticolo%2Dvero/`);
  assert.equal(esito.tipo, 'passa');
});
