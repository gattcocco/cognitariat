// @ts-check
import { defineConfig } from 'astro/config';

// Sito statico: le route server-side (checkout, webhook, portal) vivono in /functions
// come Cloudflare Pages Functions native, non come adapter Astro (vedi README + piano).

/**
 * `site` decide gli URL assoluti: canonical, og:image, sitemap. Sbagliarlo non
 * rompe niente in modo visibile, ed e' proprio per questo che va scelto con cura.
 *
 * La regola e': **la produzione dichiara il dominio pubblico, l'anteprima dichiara
 * se stessa.**
 *
 * Il tranello sta in CF_PAGES_URL, che sembra la variabile giusta e non lo e' del
 * tutto: contiene l'URL del *deployment*, anche in produzione. Usarla sempre
 * avrebbe messo il sito pubblico a dichiarare come canonico un indirizzo
 * `*.pages.dev` invece di cognitariatzone.org, e la sitemap avrebbe elencato
 * quello: un modo silenzioso di regalare il proprio posizionamento a un dominio
 * di servizio. Qui la si usa solo quando il ramo in costruzione non e' quello di
 * produzione, cioe' quando siamo davvero in anteprima.
 */
const ramo = process.env.CF_PAGES_BRANCH;
const ramoProduzione = process.env.BRANCH_PRODUZIONE || 'main';
const dominioPubblico = process.env.SITO_PUBBLICO_URL || 'https://cognitariatzone.org';
const inAnteprima = Boolean(ramo) && ramo !== ramoProduzione;

const site = inAnteprima ? process.env.CF_PAGES_URL || dominioPubblico : dominioPubblico;

// https://astro.build/config
export default defineConfig({
  site,
});
