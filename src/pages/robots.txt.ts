import type { APIRoute } from 'astro';

/**
 * robots.txt.
 *
 * Il `noindex` nelle pagine e questo file fanno due cose diverse e servono
 * entrambe: il meta dice al motore di ricerca «hai letto, non pubblicare», il
 * robots gli dice «non passare proprio». Su un'anteprima serve il secondo,
 * altrimenti il lavoro in corso viene comunque scaricato e finisce nelle cache.
 *
 * Nessuno dei due rende privato niente: chi ha l'indirizzo apre la pagina lo
 * stesso. Per quello serve un controllo d'accesso — vedi src/lib/articoli.ts.
 */
export const GET: APIRoute = ({ site }) => {
  const ramo = import.meta.env.CF_PAGES_BRANCH ?? process.env?.CF_PAGES_BRANCH;
  const ramoProduzione =
    import.meta.env.BRANCH_PRODUZIONE ?? process.env?.BRANCH_PRODUZIONE ?? 'main';
  const inAnteprima = Boolean(ramo) && ramo !== ramoProduzione;

  const testo = inAnteprima
    ? `# Anteprima di lavorazione (ramo ${ramo}): non e' il sito pubblico.
User-agent: *
Disallow: /
`
    : `User-agent: *
Allow: /

# L'area di redazione non e' contenuto da indicizzare.
Disallow: /admin/

Sitemap: ${new URL('/sitemap.xml', site ?? 'https://cognitariatzone.org').href}
`;

  return new Response(testo, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
