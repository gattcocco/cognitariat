// @ts-check
import { defineConfig } from 'astro/config';

// Sito statico: le route server-side (checkout, webhook, portal) vivono in /functions
// come Cloudflare Pages Functions native, non come adapter Astro (vedi README + piano).

/**
 * `site` serve per gli URL assoluti: canonical, og:image, sitemap.
 * Su Cloudflare Pages, CF_PAGES_URL punta al deployment in corso, quindi una
 * preview dichiara se stessa invece di dichiarare il sito di produzione — che
 * sarebbe sbagliato e, per la sitemap, dannoso.
 * In locale e in produzione si usa il dominio vero.
 */
const site = process.env.CF_PAGES_URL || 'https://cognitariatzone.org';

// https://astro.build/config
export default defineConfig({
  site,
});
