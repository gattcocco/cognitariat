# COG U — Sindacato del lavoro cognitivo

Sito di **COG U**, associazione sindacale senza fini di lucro, costituita il 12 luglio 2026.
Online su **[cognitariatzone.org](https://cognitariatzone.org)**.

Sito statico costruito con **Astro**, pubblicato su **Cloudflare Pages**. I contenuti —
articoli e appuntamenti — si scrivono da un CMS che sta sul sito stesso, senza toccare il
codice.

---

## Le tre cose da sapere prima di toccare qualcosa

1. **Il ramo di produzione è `feat/membership-v2-1`.** Non `main`. È quello che Cloudflare
   costruisce e pubblica sul dominio, ed è anche quello su cui scrive il CMS.
2. **`main` è storia**: contiene il sito precedente, fermo ad agosto 2026. Non lo costruisce
   e non lo pubblica più nessuno — GitHub Pages è stato spento il 24/09/2026. Non va unito
   a niente.
3. **Prima di ogni rilascio si esegue `npm run verify`.** Se non passa, non si rilascia.

## Come è fatto

| Livello | Scelta |
|---|---|
| Sito | [Astro](https://astro.build) 7, statico, senza adapter |
| Contenuti | Astro Content Collections: `src/content/articles` e `src/content/eventi` |
| Redazione | [Sveltia CMS](https://github.com/sveltia/sveltia-cms) su `/admin`, accesso con GitHub |
| Server | Cloudflare Pages Functions, in `/functions` (nessun server nostro) |
| Account e database | Supabase (regione UE) — pronto, iscrizioni ancora chiuse |
| Pagamenti | Stripe — predisposti e **spenti**: i tre checkout rispondono 503 |
| Caratteri e icone | ospitati da noi: niente CDN, nessuna terza parte nelle pagine pubbliche |

Le pagine pubbliche **non contattano nessun servizio di terzi**, non impostano cookie e non
usano strumenti di statistica. È una promessa scritta nell'[informativa](https://cognitariatzone.org/privacy/)
e verificata a ogni build (`npm run check:testi` segnala anche un'immagine presa da un altro sito).

## Lavorare al sito

```bash
npm install
npm run dev      # http://localhost:4321
npm run verify   # build + tipi + glifi + testi + CMS + test: da fare prima di ogni rilascio
```

Serve **Node 22.12 o superiore**.

### Rami e rilascio

```
dev  ──►  feat/membership-v2-1  ──►  cognitariatzone.org
 │                │
 │                └── il CMS scrive qui, e ogni salvataggio ricostruisce il sito
 └── anteprima: dev.cognitariat.pages.dev
```

Si lavora su `dev`, si guarda l'anteprima, poi si porta in produzione con un **merge normale**
(niente rebase, niente force push, niente riscritture di cronologia). Dopo ogni tornata di
lavoro conviene riportare in `dev` i contenuti che la redazione ha scritto in produzione.

### I controlli, e cosa hanno imparato a evitare

`npm run verify` esegue, in quest'ordine: build, controllo dei tipi (pagine e Functions),
glifi, testi, configurazione del CMS, test delle Functions. **L'ordine conta**: il controllo
dei tipi deve venire dopo la build, perché il codice che protegge `/blog/` e `/agenda/` legge
un file che genera la build.

- **glifi**: i caratteri tipografici sono ospitati da noi in sottoinsiemi ridotti. Un carattere
  fuori da quei sottoinsiemi tornerebbe in silenzio al font di sistema.
- **testi**: nessun segnaposto di bozza in pagina, nessuna parola incollata al tag che segue,
  nessuna immagine presa da un altro sito.
- **test delle Functions**: i tre checkout devono restare chiusi finché i pagamenti sono in
  pausa, senza nemmeno una chiamata di rete.

## Per chi scrive sul sito

Si entra da **[/admin](https://cognitariatzone.org/admin/)** con il proprio account GitHub, che
deve avere accesso in scrittura al repository. Ogni salvataggio è un commit, e ogni commit
ricostruisce il sito: passano un paio di minuti.

Due regole che nascono da guasti veri:

- **le immagini si caricano, non si incollano.** Un indirizzo di un'altra pagina web fa
  arrivare l'IP di chi legge a quel sito;
- **se una pubblicazione non compare, il problema non è il CMS.** Il salvataggio riesce sempre;
  può fallire la costruzione successiva, e di quella dal CMS non arriva nessun segnale. Si
  guarda l'esito su Cloudflare o nella scheda Actions di GitHub.

La guida completa è in **[docs/redazione-cms.md](docs/redazione-cms.md)**.

## Documentazione

| File | Cosa contiene |
|---|---|
| [docs/redazione-cms.md](docs/redazione-cms.md) | come si pubblica, e cosa fare quando qualcosa non esce |
| [docs/rilascio-e-ripristino.md](docs/rilascio-e-ripristino.md) | come si rilascia e come si torna indietro |
| [docs/registro-fasi.md](docs/registro-fasi.md) | registro del lavoro: cosa è stato fatto, quando e perché |
| [docs/guida-stripe.md](docs/guida-stripe.md) | dall'account Stripe al primo pagamento di prova |
| [docs/conservazione-dati.md](docs/conservazione-dati.md) | per quanto si tengono i dati, e cosa resta da deliberare |
| [docs/dati-associazione.md](docs/dati-associazione.md) | dati dell'ente e da dove risultano |
| [docs/manuale-brand.md](docs/manuale-brand.md) | colori, caratteri, contrasti |
| [docs/copy-home-v2.md](docs/copy-home-v2.md) | i testi della home e le regole che li governano |

## Dati e segreti

Nel repository **non entrano** chiavi, token, IBAN, documenti firmati né dati personali. Le
variabili d'ambiente si impostano nel pannello di Cloudflare Pages; i modelli senza valori
sono in `.env.example` e `.dev.vars.example`.

Le istruzioni per il database stanno in `supabase/migrations/` e si eseguono a mano dal pannello
Supabase: nessuno script del repository tocca il database remoto.

## Licenza

- **Codice**: [MIT](LICENSE)
- **Contenuti** (testi, articoli, manifesto): [CC BY-SA 4.0](LICENSE-CONTENT)

## Contatti

Email: **cognitariatz@proton.me** — per informazioni, per raccontare un caso, per collaborare.
