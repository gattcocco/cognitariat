# COG U — Sindacato del Cognitariato

Sito web di COG U. Attualmente in fase di migrazione da HTML statico monolitico a un progetto Astro con gestione collaborativa dei contenuti.

## Stato del progetto

- **v0 (attuale)**: singolo `index.html` statico, ospitato su GitHub Pages, dominio via GoDaddy.
- **v1 (in corso)**: refactor in componenti Astro + CMS per gli articoli, in modo che i contenuti (non il codice) possano essere scritti da più persone senza toccare git.

## Stack tecnico

| Livello | Scelta |
|---|---|
| Framework | [Astro](https://astro.build) (static site generator) |
| Contenuti articoli | Astro Content Collections (`src/content/articles`) |
| Editor per non-sviluppatori | [Sveltia CMS](https://github.com/sveltia/sveltia-cms) montato su `/admin` |
| Hosting | Cloudflare Pages |
| Dominio | GoDaddy (DNS puntato su Cloudflare Pages) |
| Font/icone | Google Fonts (Inter), Font Awesome via CDN — invariati dalla v0 |
| Animazioni | anime.js via CDN (import ESM) — invariato dalla v0 |

**Perché Cloudflare Pages**: build più veloci di GitHub Actions, preview deploy automatico per ogni PR (utile per rivedere un articolo prima che vada online), e configurazione OAuth più semplice per il CMS. Il repo resta su GitHub: cambia solo dove viene "buildato e servito" il sito, non dove vive il codice.

## Struttura repo (target)

```
src/
  layouts/
    BaseLayout.astro       # head, meta, OG, JSON-LD Schema.org, font
  components/
    Header.astro
    Footer.astro
    Hero.astro
    ContractSupport.astro
    Imaginarium.astro      # slideshow immagini
    Legal.astro
    Strike.astro
    Advocacy.astro
    Membership.astro
    Merch.astro
    OrganizerCta.astro
  content/
    config.ts              # schema Zod per la collection "articles"
    articles/               # file .md/.mdx, scritti via CMS
    authors.json
  pages/
    index.astro             # assembla i componenti sopra
  styles/
    global.css              # CSS globale, migrato 1:1 dalla v0
public/
  admin/
    index.html
    config.yml               # config Sveltia CMS
```

Le sezioni della homepage (hero, membership, merch, ecc.) restano **codice**, editato via GitHub da chi contribuisce a design/struttura. Solo gli **articoli** passano dal CMS — nella v0 non esiste ancora un blog reale, quindi la collection parte vuota e si popola quando qualcuno inizia a scrivere.

## Setup locale

```bash
npm install
npm run dev
```

Il sito è visibile su `http://localhost:4321`.

## Piano di migrazione (checklist)

1. Init progetto Astro (`npm create astro@latest`)
2. Estrazione di head/meta/Open Graph/JSON-LD dalla v0 in `BaseLayout.astro` — **nessuna modifica ai dati strutturati**, devono restare identici per non perdere indicizzazione
3. Migrazione del CSS globale in `src/styles/global.css`, import nel layout
4. Split delle sezioni della v0 in componenti Astro (una sezione = un componente)
5. Migrazione degli script vanilla (smooth scroll, handler CTA, slideshow) nei componenti pertinenti
6. Migrazione dell'intro animation (anime.js via CDN) — resta un `<script type="module">`
7. Setup `src/content/config.ts` con schema `articles` (title, data, autore, excerpt, cover, body)
8. Setup Sveltia CMS in `public/admin/config.yml` — backend `github`, `editorial_workflow: true` (bozza → PR → revisione → pubblicazione, nessuno scrive direttamente su `main`)
9. Collegamento repo GitHub → Cloudflare Pages (build automatica ad ogni push)
10. Aggiornamento DNS su GoDaddy: CNAME verso l'hostname fornito da Cloudflare Pages
11. Verifica end-to-end: build pulita, preview deploy su una PR di prova, pubblicazione di un articolo test via CMS
12. Verifica SEO post-migrazione: stessi URL, stesso markup meta/OG/JSON-LD della v0, redirect se qualche path cambia

## Come contribuire

### Codice (componenti, grafica, struttura)
- Branch da `main`, PR con descrizione chiara di cosa cambia
- Revisione prima del merge

### Contenuti (articoli)
- Accesso a `/admin` via login GitHub (OAuth)
- Flusso: bozza → anteprima (deploy preview) → revisione → pubblicazione
- *Non ancora attivo in v0 — parte con il completamento della checklist sopra*

## Licenza

- **Codice**: [MIT](LICENSE)
- **Contenuti** (testi, articoli, manifesto): [CC BY-SA 4.0](LICENSE-CONTENT)

> Nota: i file `LICENSE` e `LICENSE-CONTENT` vanno ancora aggiunti alla root del repo — questo README li referenzia in anticipo.

## Contatti e governance

- Email: cognitariatz@proton.me
- Assemblee periodiche — per partecipare, scrivere all'indirizzo sopra
- Linee guida di governance più dettagliate in arrivo in un documento separato
