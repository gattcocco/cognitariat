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

    /** Percorso pubblico della copertina, es. /images/articoli/nome.webp */
    cover: z.string().optional(),

    /**
     * Testo alternativo della copertina. Obbligatorio quando c'e' una copertina:
     * un'immagine senza alternativa testuale e' un buco per chi non la vede, e
     * lasciare il campo facoltativo significa che verra' dimenticato.
     */
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
  }).refine((d) => !d.cover || (d.coverAlt && d.coverAlt.trim().length > 0), {
    message: 'Se c\'e\' una copertina serve anche coverAlt: descrivi l\'immagine per chi non la vede.',
    path: ['coverAlt'],
  }),
});

export const collections = { articles };
