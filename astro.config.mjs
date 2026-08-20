// @ts-check
import { defineConfig } from 'astro/config';

// Sito statico: le route server-side (checkout, webhook, portal) vivono in /functions
// come Cloudflare Pages Functions native, non come adapter Astro (vedi README + piano).
// https://astro.build/config
export default defineConfig({});
