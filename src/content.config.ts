import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// zod diretto: `z` ri-esportato da astro:content e' deprecato in Astro 7.
// La versione e' fissata a quella che usa Astro, perche' lo schema passa
// attraverso il suo validatore: due major diversi non si parlerebbero.
import { z } from 'zod';

/**
 * Modello dei contenuti per gli articoli dell'osservatorio.
 *
 * I nomi dei campi coincidono con quelli in /admin/config.yml, che e' l'altra
 * meta' dello stesso contratto: se cambia uno, va cambiato l'altro, altrimenti
 * la redazione salva un articolo che il sito rifiuta di costruire.
 *
 * Il campo `bozza` non e' un doppione dell'editorial workflow del CMS. Quello
 * governa il ciclo di revisione su Git (ramo dedicato, pull request); questo
 * governa la visibilita' sul sito costruito. Servono entrambi: un articolo puo'
 * essere gia' su `dev` — perche' lo stiamo guardando insieme — e non dover
 * comparire a nessun altro. Un'anteprima pubblica resta pubblica.
 */
const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),

    /**
     * Data di pubblicazione. Scritta nel file come 'AAAA-MM-GG' e letta qui come
     * data pura, senza orario e senza fuso: `z.coerce.date()` su una stringa del
     * genere la interpreta a mezzanotte UTC, e in Italia (UTC+1/+2) stampata con
     * il fuso locale tornerebbe indietro di un giorno. Il 6 settembre diventerebbe
     * il 5. Qui la stringa viene spezzata a mano e ricomposta come data locale.
     */
    date: z.union([z.string(), z.date()]).transform((v, ctx) => {
      if (v instanceof Date) return v;
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
      if (!m) {
        ctx.addIssue({ code: 'custom', message: `data non valida: "${v}" (attesa AAAA-MM-GG)` });
        return new Date(NaN);
      }
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    }),

    /** Firma. Puo' essere una persona o una redazione ("Editoriale"). */
    autore: z.string(),

    /** Sommario: usato nell'elenco, in home e nei metadati social. */
    excerpt: z.string(),

    /**
     * Copertina: obbligatoria, immagine e testo alternativo insieme.
     *
     * Decisione editoriale del 09/09/2026: ogni articolo ha una copertina. Il
     * gruppo non e' piu' facoltativo, e i due campi dentro nemmeno — un'immagine
     * senza descrizione e' invisibile a chi non la vede, e una descrizione senza
     * immagine non descrive niente. Vanno insieme o non vanno.
     *
     * Il controllo e' ripetuto qui alla costruzione del sito, oltre che nel CMS:
     * il CMS non e' l'unico modo di scrivere un file — si puo' sempre
     * modificarlo a mano su Git — e una regola che vale solo nell'interfaccia
     * non e' una regola. Vedi docs/redazione-cms.md §5.
     */
    /*
     * Dichiarato facoltativo qui e reso obbligatorio nel controllo piu' sotto, che
     * non e' un giro inutile: se l'obbligo stesse qui, un articolo senza copertina
     * fallirebbe con il messaggio di serie «copertina: Required» e il resto dei
     * controlli non girerebbe nemmeno — compreso quello che spiega come migrare la
     * forma vecchia. Cioe' chi ha un file scritto col vecchio schema si vedrebbe
     * dire «Required» su un campo che non ha mai sentito nominare, invece delle
     * istruzioni. Rimandare l'obbligo di due righe fa uscire il messaggio giusto in
     * tutti i casi.
     */
    copertina: z
      .object({
        /** Percorso pubblico, es. /images/articoli/nome.webp */
        file: z.string(),
        alt: z.string(),
      })
      .optional(),

    /**
     * Forma precedente, due campi affiancati. Restano dichiarati solo per
     * accorgersene: un file rimasto indietro non deve costruire in silenzio,
     * perche' il CMS non conosce piu' questi due nomi e al primo salvataggio li
     * toglierebbe — cioe' farebbe sparire la copertina senza dirlo a nessuno.
     */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),

    /**
     * Nota della redazione, stampata in coda all'articolo dentro un riquadro che
     * la distingue dal testo. Serve quando il testo va lasciato com'e' ma manca
     * al lettore un'informazione di contesto: e' il caso del manifesto, che
     * chiama all'iscrizione mentre il tesseramento online non e' ancora aperto.
     * Aggiungere una nota non e' modificare il testo — ed e' esattamente per non
     * doverlo modificare che il campo esiste.
     */
    notaRedazione: z.string().optional(),

    /** Fuori dagli elenchi pubblici, dalla home e dalla sitemap finche' e' true. */
    bozza: z.boolean().default(false),
  })
    .superRefine((d, ctx) => {
      if (d.cover !== undefined || d.coverAlt !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['copertina'],
          message:
            'Forma vecchia della copertina. Sostituisci "cover" e "coverAlt" con un solo gruppo:\n' +
            '  copertina:\n    file: /images/articoli/....webp\n    alt: descrizione dell\'immagine\n' +
            'Lasciarli com\'erano non e\' innocuo: il CMS non conosce piu\' quei due nomi e al primo ' +
            'salvataggio li toglierebbe, facendo sparire la copertina senza dirlo a nessuno.',
        });
      }
      if (!d.copertina) {
        ctx.addIssue({
          code: 'custom',
          path: ['copertina'],
          message:
            'Ogni articolo deve avere una copertina. Aggiungi al frontmatter:\n' +
            '  copertina:\n    file: /images/articoli/....webp\n    alt: descrizione dell\'immagine\n' +
            'Dal CMS il campo e\' obbligatorio e non lascia salvare senza.',
        });
        return;
      }
      // Uno spazio non e' una descrizione: si confronta il valore ripulito.
      if (d.copertina.alt.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['copertina', 'alt'],
          message: 'Descrivi la copertina per chi non puo\' vederla: senza, l\'articolo non si pubblica.',
        });
      }
      if (d.copertina.file.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['copertina', 'file'],
          message: 'Manca il file della copertina: ogni articolo deve averne una.',
        });
      }
    })
    /**
     * Le pagine continuano a leggere `cover` e `coverAlt`: cambiare il modo in
     * cui il dato si scrive non deve costringere a toccare ogni componente che
     * lo mostra.
     */
    .transform((d) => ({
      ...d,
      // Il ramo senza copertina non si raggiunge: il controllo qui sopra ha gia'
      // fermato la costruzione, e zod non esegue la trasformazione se ci sono
      // errori. I `??` esistono solo per il verificatore di tipi.
      cover: d.copertina?.file ?? '',
      coverAlt: d.copertina?.alt ?? '',
    })),
});

export const collections = { articles };
