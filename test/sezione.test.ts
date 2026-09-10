import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { decidi } from '../functions/_lib/sezione';

/**
 * Prove sulla protezione che sta davanti a /blog/ e /agenda/: quella che decide
 * se un indirizzo di contenuto esiste ancora in questo deployment.
 *
 * Si importa la funzione vera, non una copia. L'elenco degli slug si passa come
 * terzo argomento: senza, la prova dipenderebbe da quanti contenuti ci sono sul
 * sito oggi, e cambierebbe esito ogni volta che la redazione pubblica qualcosa.
 */

const ARTICOLI: ReadonlySet<string> = new Set([
  'manifesto-cognitario-contro-oligarchia-ai',
  'un-altro-articolo-vero',
]);

const EVENTI: ReadonlySet<string> = new Set([
  'manifestazione-data-center-rho',
  'assemblea-e-workshop-del-mercoledi',
]);

test('contenuto valido: passa, il middleware non si mette in mezzo', () => {
  for (const p of [
    '/blog/manifesto-cognitario-contro-oligarchia-ai/',
    '/blog/manifesto-cognitario-contro-oligarchia-ai',
    '/blog/un-altro-articolo-vero/',
  ]) {
    assert.equal(decidi(p, 'blog', ARTICOLI), 'passa', `doveva passare: ${p}`);
  }
  for (const p of ['/agenda/manifestazione-data-center-rho/', '/agenda/assemblea-e-workshop-del-mercoledi/']) {
    assert.equal(decidi(p, 'agenda', EVENTI), 'passa', `doveva passare: ${p}`);
  }
});

test('slug mai esistito: intercettato in entrambe le sezioni', () => {
  const a = decidi('/blog/non-e-mai-esistito/', 'blog', ARTICOLI);
  assert.notEqual(a, 'passa');
  assert.deepEqual(a, { slug: 'non-e-mai-esistito' });

  const e = decidi('/agenda/non-e-mai-esistito/', 'agenda', EVENTI);
  assert.notEqual(e, 'passa');
  assert.deepEqual(e, { slug: 'non-e-mai-esistito' });
});

test('contenuto eliminato: lo stesso indirizzo che prima funzionava viene intercettato', () => {
  // Era in elenco fino al deployment precedente; dopo la cancellazione non c'è.
  const slugArticolo = 'prova-cache-produzione-da-eliminare';
  assert.equal(ARTICOLI.has(slugArticolo), false, 'la premessa: non è più fra i pubblicati');
  assert.deepEqual(decidi(`/blog/${slugArticolo}/`, 'blog', ARTICOLI), { slug: slugArticolo });

  const slugEvento = 'serata-annullata';
  assert.equal(EVENTI.has(slugEvento), false);
  assert.deepEqual(decidi(`/agenda/${slugEvento}/`, 'agenda', EVENTI), { slug: slugEvento });
});

test('una bozza non è fra le pagine costruite, quindi viene intercettata', () => {
  // In una build pubblica la pagina di una bozza non viene generata: il suo
  // slug non entra nell'elenco, e l'indirizzo indovinato non porta a niente.
  assert.deepEqual(decidi('/agenda/evento-in-bozza/', 'agenda', EVENTI), { slug: 'evento-in-bozza' });
});

test('gli elenchi delle sezioni non vengono toccati', () => {
  for (const p of ['/blog/', '/blog']) assert.equal(decidi(p, 'blog', ARTICOLI), 'passa');
  for (const p of ['/agenda/', '/agenda']) assert.equal(decidi(p, 'agenda', EVENTI), 'passa');
});

test('percorsi più profondi e file dentro la sezione passano', () => {
  for (const p of [
    '/blog/index.html',
    '/agenda/index.html',
    '/agenda/manifestazione-data-center-rho/locandina.webp',
    '/blog/qualcosa/di/profondo/',
  ]) {
    assert.equal(decidi(p, 'blog', ARTICOLI), 'passa', p);
    assert.equal(decidi(p, 'agenda', EVENTI), 'passa', p);
  }
});

test('fuori dalla sezione la protezione non esiste: home, privacy, admin, OAuth, copertine', () => {
  for (const p of [
    '/',
    '/privacy/',
    '/sitemap.xml',
    '/robots.txt',
    '/admin/',
    '/admin/config.yml',
    '/api/cms-auth',
    '/api/cms-callback',
    '/images/articoli/manifesto-cognitario-contro-oligarchia-ai.webp',
    '/images/agenda/manifestazione-data-center-rho.webp',
  ]) {
    assert.equal(decidi(p, 'blog', ARTICOLI), 'passa', p);
    assert.equal(decidi(p, 'agenda', EVENTI), 'passa', p);
  }
});

test('una sezione non guarda gli slug dell\'altra', () => {
  // Un evento non è un articolo: /blog/<slug-di-evento> non deve passare solo
  // perché quello slug esiste in agenda.
  assert.deepEqual(decidi('/blog/manifestazione-data-center-rho/', 'blog', ARTICOLI), {
    slug: 'manifestazione-data-center-rho',
  });
});

test('uno slug con caratteri codificati viene confrontato decodificato', () => {
  assert.equal(decidi('/blog/un%2Daltro%2Darticolo%2Dvero/', 'blog', ARTICOLI), 'passa');
});

test('un percorso codificato male non fa esplodere niente', () => {
  assert.equal(decidi('/blog/%E0%A4%A/', 'blog', ARTICOLI), 'passa');
});
