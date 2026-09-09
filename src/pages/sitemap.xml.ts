import type { APIRoute } from 'astro';
import { articoliPubblicati, dataIso } from '../lib/articoli';
import { eventiPubblicati, datetimeIso } from '../lib/eventi';

/**
 * Sitemap scritta a mano invece che con @astrojs/sitemap.
 *
 * Il motivo e' uno solo ma decisivo: qui si decide cosa entra. Il plugin
 * elencherebbe ogni pagina costruita, e con una build che mostra le bozze
 * (MOSTRA_BOZZE=true) ci finirebbe dentro anche una bozza. Questa lista parte
 * dagli articoli **pubblicati**, punto: le bozze non ci sono per costruzione,
 * non per configurazione.
 *
 * `/account` e `/auth/callback` restano fuori: sono pagine di servizio, non
 * contenuti da far trovare in una ricerca.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://cognitariatzone.org');
  const oggi = dataIso(new Date());

  const statiche: Array<{ percorso: string; priorita: string; frequenza: string }> = [
    { percorso: '/', priorita: '1.0', frequenza: 'weekly' },
    { percorso: '/blog/', priorita: '0.8', frequenza: 'weekly' },
    { percorso: '/agenda/', priorita: '0.8', frequenza: 'weekly' },
    { percorso: '/privacy/', priorita: '0.3', frequenza: 'yearly' },
  ];

  const articoli = await articoliPubblicati();
  const eventi = await eventiPubblicati();

  const voci = [
    ...statiche.map((s) => ({
      url: new URL(s.percorso, base).href,
      lastmod: oggi,
      changefreq: s.frequenza,
      priority: s.priorita,
    })),
    ...articoli.map((a) => ({
      url: new URL(`/blog/${a.id}/`, base).href,
      lastmod: dataIso(a.data.date),
      changefreq: 'yearly',
      priority: '0.7',
    })),
    // Gli eventi: `lastmod` e' la data dell'appuntamento quando c'e', altrimenti
    // quella della build — un ricorrente non ha una data propria.
    ...eventi.map((e) => ({
      url: new URL(`/agenda/${e.evento.id}/`, base).href,
      lastmod: e.inizio ? datetimeIso(e.inizio).slice(0, 10) : oggi,
      changefreq: 'monthly',
      priority: '0.7',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${voci
  .map(
    (v) => `  <url>
    <loc>${v.url}</loc>
    <lastmod>${v.lastmod}</lastmod>
    <changefreq>${v.changefreq}</changefreq>
    <priority>${v.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
