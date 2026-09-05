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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
