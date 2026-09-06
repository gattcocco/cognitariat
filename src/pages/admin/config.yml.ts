import type { APIRoute } from 'astro';

/**
 * Configurazione del CMS, generata al build invece di stare ferma in public/.
 *
 * Il motivo e' `base_url`: e' l'origine del servizio che completa il login
 * OAuth, e quel servizio siamo noi (functions/api/cms-auth.ts). L'origine pero'
 * cambia fra sito, anteprima di ramo e singolo deployment, e un valore scritto
 * a mano sarebbe giusto in un posto e sbagliato negli altri.
 *
 * CMS_AUTH_BASE_URL ha la precedenza perche' GitHub accetta un solo indirizzo di
 * callback per applicazione OAuth: va puntato a un indirizzo stabile — l'alias
 * di ramo, non l'URL del singolo deployment, che cambia a ogni build.
 *
 * I campi qui sotto devono corrispondere a quelli in src/content.config.ts: sono
 * le due facce dello stesso contratto. Se se ne aggiunge uno di la', va aggiunto
 * anche qui, altrimenti la redazione non ha modo di compilarlo.
 */
export const GET: APIRoute = ({ site }) => {
  const baseUrl =
    import.meta.env.CMS_AUTH_BASE_URL ??
    process.env?.CMS_AUTH_BASE_URL ??
    (site ? site.origin : 'https://dev.cognitariat.pages.dev');

  const yaml = `# File generato da src/pages/admin/config.yml.ts: non modificarlo a mano,
# le modifiche verrebbero sovrascritte al prossimo build.

backend:
  name: github
  repo: gattcocco/cognitariat
  # Si scrive su dev, mai su main. main e' il ramo che serve il sito pubblico
  # tramite GitHub Pages: il CMS non deve poterlo toccare. Da dev il contenuto
  # arriva alla preview, e da li' si decide se e quando portarlo altrove.
  branch: dev
  base_url: ${baseUrl}
  auth_endpoint: api/cms-auth
  commit_messages:
    create: 'Articolo: aggiunge "{{slug}}"'
    update: 'Articolo: aggiorna "{{slug}}"'
    delete: 'Articolo: rimuove "{{slug}}"'
    uploadMedia: 'Media: aggiunge {{path}}'
    deleteMedia: 'Media: rimuove {{path}}'

media_folder: public/images/articoli
public_folder: /images/articoli

collections:
  - name: articles
    label: Articoli
    label_singular: Articolo
    description: >-
      Un articolo resta invisibile finche' "Bozza" e' attivo: non compare nel
      blog, non compare in home e non finisce nella mappa del sito. Toglierlo e'
      l'atto con cui si pubblica.
    folder: src/content/articles
    create: true
    slug: '{{slug}}'
    extension: md
    format: frontmatter
    sortable_fields: ['date', 'title']
    view_filters:
      - label: Solo bozze
        field: bozza
        pattern: true
      - label: Solo pubblicati
        field: bozza
        pattern: false
    fields:
      - label: Titolo
        name: title
        widget: string
        hint: Come apparira' in cima all'articolo, nell'elenco e nella scheda condivisa sui social.

      - label: Bozza
        name: bozza
        widget: boolean
        default: true
        hint: >-
          Finche' e' attivo l'articolo non e' pubblico da nessuna parte. I nuovi
          articoli nascono cosi' apposta.

      - label: Data di pubblicazione
        name: date
        widget: datetime
        date_format: 'YYYY-MM-DD'
        time_format: false
        picker_utc: false
        hint: >-
          Solo il giorno, senza orario. Senza fuso orario: con l'ora la data
          rischia di comparire sul sito spostata di un giorno.

      - label: Firma
        name: autore
        widget: string
        default: Editoriale
        hint: Una persona, oppure "Editoriale" per un testo della redazione.

      - label: Sommario
        name: excerpt
        widget: text
        hint: >-
          Due o tre righe. Si legge nell'elenco, nel richiamo in home e
          nell'anteprima quando qualcuno condivide il link.

      - label: Immagine di copertina
        name: cover
        widget: image
        required: false
        hint: Facoltativa. Se c'e', va compilato anche il testo alternativo qui sotto.

      - label: Testo alternativo della copertina
        name: coverAlt
        widget: string
        required: false
        hint: >-
          Descrivi l'immagine per chi non la vede. Obbligatorio quando c'e' una
          copertina: senza, il sito si rifiuta di costruire l'articolo.

      - label: Corpo
        name: body
        widget: markdown
`;

  return new Response(yaml, {
    headers: { 'content-type': 'text/yaml; charset=utf-8' },
  });
};
