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
  /**
   * Origine del servizio di login. Deve essere **stabile**: GitHub accetta un
   * solo indirizzo di callback per applicazione OAuth, e l'URL del singolo
   * deployment cambia a ogni build — con quello, il login funzionerebbe per una
   * build e si romperebbe alla successiva.
   *
   * Se non e' dichiarata a mano, si ricava l'alias di ramo di Cloudflare Pages,
   * che e' stabile: <ramo>.<progetto>.pages.dev. La regola di normalizzazione e'
   * quella di Cloudflare — minuscolo, tutto cio' che non e' lettera o cifra
   * diventa un trattino, massimo 28 caratteri.
   */
  const ramoPerAlias = import.meta.env.CF_PAGES_BRANCH ?? process.env?.CF_PAGES_BRANCH;
  const aliasDiRamo = ramoPerAlias
    ? `https://${ramoPerAlias.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 28)}.cognitariat.pages.dev`
    : undefined;

  const baseUrl =
    import.meta.env.CMS_AUTH_BASE_URL ??
    process.env?.CMS_AUTH_BASE_URL ??
    aliasDiRamo ??
    (site ? site.origin : 'https://dev.cognitariat.pages.dev');

  /**
   * Ramo su cui il CMS scrive. Oggi `dev`, perche' e' il ramo della preview.
   * Al rilascio va messo il ramo che serve il sito pubblico: e' una variabile e
   * non un valore scritto nel codice proprio per quello — cambiare ambiente non
   * deve richiedere una modifica al programma, altrimenti al momento del
   * passaggio la redazione continuerebbe a scrivere sul ramo sbagliato e non
   * capirebbe perche' gli articoli non compaiono.
   */
  const ramo = import.meta.env.CMS_BRANCH ?? process.env?.CMS_BRANCH ?? 'dev';

  const yaml = `# File generato da src/pages/admin/config.yml.ts: non modificarlo a mano,
# le modifiche verrebbero sovrascritte al prossimo build.

backend:
  name: github
  repo: gattcocco/cognitariat
  # Ramo su cui scrive il CMS, da CMS_BRANCH. Oggi e' il ramo della preview;
  # al rilascio si cambia la variabile, non questo file.
  branch: ${ramo}
  base_url: ${baseUrl}
  auth_endpoint: api/cms-auth
  commit_messages:
    create: 'Articolo: aggiunge "{{slug}}"'
    update: 'Articolo: aggiorna "{{slug}}"'
    delete: 'Articolo: rimuove "{{slug}}"'
    uploadMedia: 'Media: aggiunge {{path}}'
    deleteMedia: 'Media: rimuove {{path}}'

# Ogni collection dichiara la propria cartella di immagini (vedi piu' sotto):
# gli articoli in public/images/articoli, gli eventi in public/images/agenda.
# Le due chiavi qui restano come valore di ripiego.
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

      - label: Copertina
        name: copertina
        widget: object
        required: true
        collapsed: false
        hint: >-
          Ogni articolo ha una copertina. Servono tutte e due le cose, l'immagine
          e la descrizione: e' il modo per non pubblicare una figura che una
          parte delle persone non puo' vedere.
        fields:
          - label: Immagine
            name: file
            widget: image
            required: true
            hint: >-
              Rimpiccioliscila prima di caricarla: 1200 pixel di larghezza
              bastano. WebP per la pagina, e un JPEG con lo stesso nome accanto
              se vuoi che si veda bene quando qualcuno condivide il link.

          - label: Testo alternativo
            name: alt
            widget: string
            required: true
            hint: Descrivi la copertina per chi non puo' vederla.

      - label: Corpo
        name: body
        widget: markdown

      - label: Nota della redazione
        name: notaRedazione
        widget: text
        required: false
        hint: >-
          Facoltativa. Compare in coda all'articolo, in un riquadro separato dal
          testo. Serve per aggiungere un contesto senza toccare il testo di
          qualcun altro: per esempio dire che una cosa annunciata nell'articolo
          non e' ancora disponibile.

  - name: eventi
    label: Agenda
    label_singular: Evento
    description: >-
      Appuntamenti: assemblee, manifestazioni, workshop, serate. Come per gli
      articoli, finche' "Bozza" e' attivo l'evento non esiste per chi visita il
      sito. Un appuntamento con una data finisce in ordine cronologico e a un
      certo punto passa nell'archivio; uno che si ripete si descrive con
      l'etichetta "Si ripete" e resta sempre valido.
    folder: src/content/eventi
    create: true
    slug: '{{slug}}'
    extension: md
    format: frontmatter
    media_folder: ../../../public/images/agenda
    public_folder: /images/agenda
    sortable_fields: ['inizio', 'title']
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
        hint: Come apparira' nell'agenda, in home e nella scheda condivisa sui social.

      - label: Bozza
        name: bozza
        widget: boolean
        default: true
        hint: >-
          Acceso, l'evento non compare da nessuna parte: ne' in agenda, ne' in
          home, ne' nella mappa del sito. Spegnerlo e' l'atto con cui si
          pubblica.

      - label: Sommario
        name: excerpt
        widget: text
        hint: >-
          Due o tre righe: cos'e' e perche' venire. Si legge nell'agenda, nel
          richiamo in home e nell'anteprima quando qualcuno condivide il link.

      - label: Inizio
        name: inizio
        widget: datetime
        required: false
        date_format: 'YYYY-MM-DD'
        time_format: 'HH:mm'
        format: 'YYYY-MM-DDTHH:mm'
        picker_utc: false
        hint: >-
          Giorno e ora di inizio, nell'ora italiana. Lascialo vuoto solo per gli
          appuntamenti che si ripetono, che vanno descritti nel campo "Si
          ripete" qui sotto.

      - label: Fine
        name: fine
        widget: datetime
        required: false
        date_format: 'YYYY-MM-DD'
        time_format: 'HH:mm'
        format: 'YYYY-MM-DDTHH:mm'
        picker_utc: false
        hint: Facoltativa. Serve solo se l'orario di chiusura e' un'informazione utile.

      - label: Si ripete
        name: ricorrenza
        widget: string
        required: false
        hint: >-
          Facoltativo, scritto a mano: per esempio "Ogni mercoledi' - dalle 19".
          Il sito non calcola la prossima data da questa frase, la mostra cosi'
          com'e': un sito statico non potrebbe tenerla aggiornata da se'.

      - label: Luogo
        name: luogo
        widget: string
        required: false
        hint: Il nome del posto, se c'e'. Per esempio "Circolo Anarchico Ponte della Ghisolfa".

      - label: Indirizzo
        name: indirizzo
        widget: string
        required: false
        hint: Via, numero e citta', se si sanno.

      - label: Copertina
        name: copertina
        widget: object
        required: true
        collapsed: false
        hint: >-
          Ogni evento ha una copertina. Servono tutte e due le cose, l'immagine e
          la descrizione: e' il modo per non pubblicare una locandina che una
          parte delle persone non puo' leggere.
        fields:
          - label: Immagine
            name: file
            widget: image
            required: true
            hint: >-
              Rimpiccioliscila prima di caricarla: 1200 pixel di lato bastano.
              WebP per la pagina, e un JPEG con lo stesso nome accanto se vuoi
              che si veda bene quando qualcuno condivide il link.

          - label: Testo alternativo
            name: alt
            widget: string
            required: true
            hint: >-
              Descrivi la copertina per chi non puo' vederla. Racconta cosa si
              vede, non ricopiare tutto il testo della locandina.

      - label: Corpo
        name: body
        widget: markdown
        required: false
        hint: >-
          Il racconto dell'evento. Puo' restare vuoto: per un appuntamento
          ricorrente spesso non c'e' niente da aggiungere oltre a quando e dove.

      - label: Link esterno
        name: linkEsterno
        widget: object
        required: false
        collapsed: false
        hint: >-
          Facoltativo. Se lo aggiungi servono tutte e due le parti: un indirizzo
          senza etichetta diventa un "clicca qui", e un'etichetta senza
          indirizzo non porta da nessuna parte.
        fields:
          - label: Indirizzo
            name: url
            widget: string
            required: true
            hint: Completo, con https://

          - label: Etichetta
            name: etichetta
            widget: string
            required: true
            hint: Cosa ci si trova, per esempio "L'evento su Mastodon".
`;

  return new Response(yaml, {
    headers: { 'content-type': 'text/yaml; charset=utf-8' },
  });
};
