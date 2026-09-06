/// <reference types="astro/client" />

/**
 * Ganci dell'animazione d'ingresso, condivisi fra lo script inline in
 * BaseLayout.astro (che parte subito, prima di qualunque modulo) e il modulo in
 * index.astro (che arriva dopo, e puo' anche non arrivare mai).
 *
 * Sono su `window` di proposito: sono due script separati, caricati in momenti
 * diversi, che devono potersi parlare senza che uno importi l'altro.
 */
declare global {
  interface Window {
    /** Scopre l'hero: toglie il gate CSS, rimuove l'overlay, ripristina il titolo. */
    __coguReveal?: () => void;
    /** Timer di sicurezza, riprogrammato dal modulo quando anime.js parte davvero. */
    __coguFailsafe?: ReturnType<typeof setTimeout>;
    /** Riporta hero e parole del titolo a stato finale. Definito dal modulo. */
    __coguHeroReset?: () => void;
    /** Vero da quando la pagina e' stata scoperta: il modulo in ritardo rinuncia. */
    __coguRivelato?: boolean;
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
  /**
   * Gemella lato browser di PAGAMENTI_ATTIVI. Decide soltanto se il ritorno dal
   * magic link puo' proseguire verso il pagamento: e' comodita', non sicurezza.
   * Il confine vero e' in src/lib/pagamenti.ts, lato server.
   */
  readonly PUBLIC_PAGAMENTI_ATTIVI?: string;
  /** "true" per costruire anche le bozze: solo anteprime locali o protette. */
  readonly MOSTRA_BOZZE?: string;
  /** Impostate da Cloudflare Pages durante il build. */
  readonly CF_PAGES_BRANCH?: string;
  readonly CF_PAGES_URL?: string;
  /** Nome del ramo che serve la produzione: tutto il resto e' anteprima (noindex). */
  readonly BRANCH_PRODUZIONE?: string;
  /**
   * Origine stabile del servizio di login del CMS, scritta in /admin/config.yml.
   * GitHub accetta un solo indirizzo di callback per applicazione OAuth, quindi
   * va puntata all'alias di ramo e non all'URL del singolo deployment.
   */
  readonly CMS_AUTH_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
