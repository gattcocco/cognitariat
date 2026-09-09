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
     * Copertina: immagine e testo alternativo insieme, o niente.
     *
     * Stanno in un gruppo e non come due campi affiancati perche' e' l'unico
     * modo, nella versione di Sveltia che usiamo, di ottenere «obbligatorio solo
     * se c'e' l'immagine»: il CMS mostra una casella «Aggiungi Copertina», e
     * finche' non la si spunta i due campi non esistono, quindi non possono
     * essere obbligatori. Spuntandola compaiono entrambi obbligatori.
     * Vedi docs/redazione-cms.md §5.
     *
     * Il controllo e' ripetuto qui alla costruzione del sito: il CMS non e'
     * l'unico modo di scrivere un file, e una regola che vale solo
     * nell'interfaccia non e' una regola.
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
      if (d.copertina && d.copertina.alt.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['copertina', 'alt'],
          message: 'Descrivi la copertina per chi non puo\' vederla: senza, l\'immagine non si pubblica.',
        });
      }
      if (d.copertina && d.copertina.file.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['copertina', 'file'],
          message: 'C\'e\' il testo alternativo ma non l\'immagine: aggiungi il file, oppure togli il gruppo.',
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
      cover: d.copertina?.file,
      coverAlt: d.copertina?.alt,
    })),
});

export const collections = { articles };
