# Handoff — sito COG U / cognitariatzone.org

**Redatto** 30/09/2026 · **Repo** `gattcocco/cognitariat`, pubblico · **Ramo di produzione**
`feat/membership-v2-1`

Documento di passaggio di consegne: tutto quello che serve per prendere in mano il progetto senza
doverlo ricostruire leggendo i commit. È **la fonte autorevole sullo stato**; il `README.md` resta
la porta d'ingresso al repository.

Prima stesura fatta il 30/09 da un thread di ricognizione, che ha controllato repo, API di GitHub e
DNS pubblico. Questa versione è stata **rivista e completata dal thread che ha fatto il lavoro**: le
due cose che la prima stesura segnalava come rotte sono state chiuse, e alcune affermazioni non più
vere sono state corrette (sono segnalate dove capita, perché sapere *cosa* era sbagliato aiuta a non
fidarsi ciecamente di nessun documento, compreso questo).

**Questo file non contiene segreti** — nessuna chiave, token, credenziale o dato personale — e per
questo può stare in un repository pubblico. Se lo aggiorni, mantieni questa proprietà. L'IBAN
dell'associazione compare nel sito e nel codice ed è una scelta deliberata: vedi §6.2.

---

## 0. Da dove si riparte

Le due cose che la prima stesura segnalava come rotte **sono state chiuse il 30/09**. Restano due
azioni, e una sola è urgente.

### 0.1 — Il keep-alive di Supabase: difetto corretto, restano due secret da inserire

Il workflow `.github/workflows/supabase-sveglia.yml` esiste perché sul piano gratuito un progetto
Supabase che per circa una settimana non riceve richieste viene **messo in pausa**. Finché
l'iscrizione online è chiusa il sito non interroga mai il database, quindi nessuna richiesta arriva
da lì: il workflow ne manda due a settimana, leggendo una riga innocua.

**Il difetto**: quando i due secret mancano, il job usciva con **successo** e una nota nel log. Era
una scelta deliberata — non mandare mail di errore prima del provisioning — con un effetto che la
annulla: **il job era verde sia quando funzionava sia quando non faceva niente**, e dalla lista dei
run i due casi erano indistinguibili. Il keep-alive non ha mai interrogato il database da quando
esiste.

**Corretto il 30/09**: adesso il job **fallisce** se i secret mancano, e fallisce se Supabase
risponde qualcosa di diverso da 200. Un run verde significa davvero che il database ha risposto. È
stato corretto anche un commento che diceva, non più a ragione, che il ramo predefinito è `main`.

**Verificato il 30/09**: il progetto Supabase **è vivo** — `GET /rest/v1/` risponde `401 No API key
found in request`, che è la risposta di un progetto attivo; uno in pausa non risponderebbe così.
Quindi nessun ripristino da fare. La prima stesura lo dava «verosimilmente già in pausa»: non lo
era.

**Cosa resta da fare, ed è di chi ha accesso al repository:**

1. impostare i due secret in *Settings → Secrets and variables → Actions*:
   - `SUPABASE_URL` → `https://<progetto>.supabase.co`
   - `SUPABASE_ANON_KEY` → la chiave **anon public** (*Project Settings → API*). È pubblica per
     costruzione — finisce nel bundle del browser — e sta in un secret solo per non scriverla nel
     workflow. **Non** la `service_role`, che è un'altra cosa e non deve uscire da Supabase;
2. lanciare il workflow a mano (*Actions → Supabase sveglia → Run workflow*) e leggere il log: deve
   comparire `Risposta di Supabase: HTTP 200`.

Finché i secret mancano il workflow **fallisce due volte a settimana**, ed è voluto: è il modo in
cui il progetto chiede di essere finito.

### 0.2 — La deriva fra produzione e `dev`: riallineata

Il CMS scrive **sul ramo di produzione**, quindi `dev` resta indietro a ogni pubblicazione della
redazione. Al 30/09 la differenza era di 4 commit. **Riallineato oggi** con un merge normale: chi
riprende trova i due rami allineati.

Non è un guasto, è il funzionamento normale: succederà di nuovo. **Prima di cominciare qualunque
lavoro, si riporta la produzione dentro `dev`:**

```bash
git fetch --all
git rev-list --left-right --count origin/dev...origin/feat/membership-v2-1   # quanta deriva c'è
git checkout dev && git merge origin/feat/membership-v2-1
```

Saltare questo passaggio non fa perdere il lavoro della redazione — Git non lo cancella — ma rende
il primo rilascio successivo un merge con conflitti su file di contenuto, che è il tipo di conflitto
peggiore da risolvere: riguarda testi che non hai scritto tu.

### 0.3 — Un difetto trovato riallineando, e corretto

Riportando i contenuti in `dev` è saltato fuori che la redazione aveva **cambiato la copertina**
dell'articolo *«Nella corsa all'AI»* lasciando però il **testo alternativo del disegno precedente**:
l'immagine era diventata un'illustrazione con Zio Sam e il dragone cinese, e la descrizione per chi
non vede continuava a dire «una persona accigliata a braccia conserte». Una descrizione falsa è
peggio di una mancante.

Corretto il 30/09, insieme al peso: il file era un JPEG da 310 KB con spazi nel nome, è diventato un
WebP da 128 KB con il nome dell'articolo.

**È il genere di cosa che il CMS non può controllare da solo**, perché richiede di guardare
l'immagine. Quando la redazione sostituisce una copertina, il testo alternativo va riletto.

---

## 1. Cos'è, e dove vive

**COG U** è un'associazione sindacale senza fini di lucro (costituita il 12/07/2026) che si occupa
di lavoro cognitivo. Il sito è il suo canale pubblico: manifesto, articoli, agenda degli
appuntamenti, e — in prospettiva — il tesseramento online.

| | |
|---|---|
| Dominio | `cognitariatzone.org` (registrar **GoDaddy**, DNS **Cloudflare**) |
| Hosting | **Cloudflare Pages** |
| Framework | **Astro 7**, sito statico, nessun adapter |
| Codice server | **Cloudflare Pages Functions** in `/functions` |
| Database / account | **Supabase**, regione Central EU (Frankfurt) |
| Pagamenti | **Stripe**, predisposto e **spento** |
| Redazione | **Sveltia CMS** su `/admin`, login con GitHub |
| Contatto pubblico | `cognitariatz@proton.me` |

Il repository locale sta in `C:\Users\web\Desktop\Sito cognitariato\cognitariat-main\cognitariat-main`.
Attenzione al doppio annidamento della cartella (`cognitariat-main\cognitariat-main`): è residuo di
uno unzip, non una scelta.

---

## 2. Il modello dei rami — la cosa più facile da sbagliare

```
dev  ──merge──►  feat/membership-v2-1  ──Cloudflare build──►  cognitariatzone.org
 │                        ▲
 │                        └── il CMS scrive QUI (ogni salvataggio = 1 commit = 1 build)
 │
 └── anteprima: dev.cognitariat.pages.dev

main  ──►  storia. Il sito di agosto 2026. Non lo costruisce e non lo pubblica nessuno.
```

**Il ramo di produzione è `feat/membership-v2-1`, non `main`.** È anche il **ramo predefinito** del
repository su GitHub [verificato 30/09]. Il nome è un incidente storico: era nato come ramo di
funzionalità per la membership, è diventato il tronco quando `main` è stato abbandonato. **Rinominarlo
è tentante e va fatto con attenzione**, perché il nome è scritto in almeno quattro posti fuori dal
codice: la configurazione del progetto Cloudflare Pages, il ramo predefinito su GitHub, la
configurazione di Sveltia CMS, e `ci.yml`. Se se ne rinomina uno solo, qualcosa smette di
pubblicare in silenzio.

**`main` non va unito a niente.** Contiene l'`index.html` monolitico del sito precedente. GitHub
Pages, che lo serviva, è stato **spento il 24/09/2026**. Unire `main` in produzione reintrodurrebbe
file morti; unire produzione in `main` non serve a nulla. Si lascia dov'è, come archivio.

La PR **#2 è stata chiusa senza merge** [verificato 30/09] — ed è la cosa giusta: il suo contenuto è
arrivato in produzione per altra via, e mergiarla in `main` era proprio l'azione che avrebbe spento
il sito (vedi §12).

### Rilascio

Si lavora su `dev`, si guarda l'anteprima, si porta in produzione con un **merge normale**. Niente
rebase, niente force push, niente riscritture di cronologia: il CMS committa su produzione, e una
cronologia riscritta sotto i piedi del CMS produce conflitti che la redazione non è in grado di
risolvere.

```bash
npm run verify                  # se non passa, non si rilascia
git checkout feat/membership-v2-1
git merge dev
git push
```

---

## 3. Architettura, nel dettaglio

### 3.1 Astro statico, senza adapter — e perché

`astro.config.mjs` è deliberatamente vuoto: `defineConfig({})`. Nessun adapter, nessun rendering
server-side di Astro. La build produce **file statici** in `dist/`.

Tutto ciò che ha bisogno di girare su un server sta **fuori** da Astro, in `/functions`, come Pages
Functions native di Cloudflare. La ragione: meno strati fra il codice e la piattaforma, e la
garanzia che le pagine pubbliche siano file statici serviti dalla CDN — quindi veloci e senza
sorprese.

### 3.2 Le Functions, e il routing per filesystem

Su Cloudflare Pages **la struttura delle cartelle è il routing**. Non c'è un file di configurazione
delle rotte: sposti il file, cambia l'URL.

| File | URL | Stato |
|---|---|---|
| `functions/api/checkout.ts` | `/api/checkout` | **spento** → 503 |
| `functions/api/checkout-sostenitore.ts` | `/api/checkout-sostenitore` | **spento** → 503 |
| `functions/api/checkout-merch.ts` | `/api/checkout-merch` | **spento** → 503 |
| `functions/api/account-delete.ts` | `/api/account-delete` | **501 di proposito** (vedi §6.1) |
| `functions/webhooks/stripe.ts` | `/webhooks/stripe` | attivo (riconcilia pagamenti già avviati) |
| `functions/api/cms-auth.ts` | `/api/cms-auth` | attivo — OAuth GitHub per il CMS |
| `functions/api/cms-callback.ts` | `/api/cms-callback` | attivo — ritorno OAuth |
| `functions/blog/_middleware.ts` | intercetta `/blog/*` | attivo (vedi §3.4) |
| `functions/agenda/_middleware.ts` | intercetta `/agenda/*` | attivo (vedi §3.4) |

Le Functions leggono le variabili da `context.env` a **runtime** (non al build): sono impostate nel
pannello Cloudflare Pages.

### 3.3 L'interruttore dei pagamenti — due bandiere, un solo confine

I pagamenti sono **spenti** e il meccanismo va capito prima di toccarlo, perché ha due metà
asimmetriche.

- **`PAGAMENTI_ATTIVI`** (server, in `.dev.vars` / pannello Cloudflare). Solo la stringa esatta
  `"true"` apre i tre checkout. Assente, vuota, `"false"`, `"1"`, `"si"` → gli endpoint rispondono
  **503 con un errore JSON**, senza costruire il client Stripe e senza scrivere niente sul database.
  La logica sta in `src/lib/pagamenti.ts`. **Questo è il confine di sicurezza.**
- **`PUBLIC_PAGAMENTI_ATTIVI`** (browser, in `.env`). È la gemella lato client, e serve solo a
  decidere se il ritorno dal magic link può proseguire verso il pagamento. È una **comodità di
  interfaccia, non una protezione**: anche se venisse manomessa, le Functions rifiutano comunque.

La distinzione è importante quando si riaccenderanno i pagamenti: **vanno messe a `true` entrambe**,
e per ragioni diverse. Solo la seconda non apre niente; solo la prima apre il server ma l'interfaccia
non ci manda nessuno.

**Il webhook Stripe non passa da questo interruttore**: resta sempre attivo, per poter riconciliare
pagamenti eventualmente già avviati. È una scelta deliberata — se un pagamento è partito, la sua
conferma deve poter arrivare anche a interruttore chiuso.

Due test automatici (`test/pagamenti.test.ts`) verificano che i tre checkout restino chiusi **senza
nemmeno fare una chiamata di rete**: `test/registra-hook.mjs` intercetta le chiamate uscenti e il
test fallisce se ne parte una. Non è un test del "risponde 503", è un test del "non prova nemmeno".

### 3.4 I middleware di `/blog/` e `/agenda/` — un guasto reale che vale la pena conoscere

Questo è il pezzo di architettura meno ovvio, e `functions/_lib/sezione.ts` lo documenta per esteso
nel codice. Riassumo, perché chi prende in mano il progetto lo incontrerà.

**Il problema, verificato l'8 e il 9 settembre in anteprima e in produzione**: un articolo cancellato
dal CMS **restava leggibile** al suo indirizzo. Tutto il resto diceva che non c'era più — commit di
cancellazione verde, deployment verde, contenuto fuori dagli elenchi e fuori dal CMS, indirizzo
specifico del deployment 404, `cognitariat.pages.dev` 404, e lo *stesso* indirizzo sul dominio con
una query string nuova 404. Solo l'indirizzo originale, senza query, continuava a servire la pagina
vecchia.

Non era la cache del browser né quella della zona: *Purge Everything* non l'ha rimossa, e Cloudflare
Trace mostrava che la regola di bypass veniva applicata e che l'origine rispondeva 404. La pagina
veniva da **uno strato statico di Pages che le direttive dell'origine non governano** — lo stesso che
in anteprima aveva ignorato `s-maxage=0`, `private` e `no-store`, quest'ultimo servito con
`CF-Cache-Status: HIT`.

**Perché un middleware**: è l'unico punto che sta **davanti** a quello strato. Una Function gira
prima che la richiesta possa essere soddisfatta da un asset statico: se si risponde lì, quello che
sta dietro non viene nemmeno interrogato. Non è una pulizia della cache — è non arrivarci.

I due middleware confrontano lo slug richiesto con l'elenco degli slug legittimi e rispondono 404
per tutto il resto.

### 3.5 La dipendenza d'ordine fra build e type-check — causa di una CI rossa per giorni

`functions/_lib/sezione.ts` importa `../../generato/slug-pagine`. La cartella `generato/` è
**prodotta dalla build** (`scripts/genera-slug.mjs`, agganciato a `npm run build`) e **non sta in
Git** (è in `.gitignore`).

Conseguenza: **il controllo dei tipi delle Functions deve venire DOPO la build**, perché prima di
quella il modulo importato non esiste. La vecchia CI lo faceva prima, falliva su un modulo che non
poteva ancora esistere, ed è così che la CI è rimasta **rossa dal 9/09/2026** senza che il sito
avesse alcun problema.

La soluzione adottata: un **unico comando**, `npm run verify`, che costruisce per primo, ed è lo
stesso che gira in locale e in CI. Il commento in `ci.yml` spiega che tenere due elenchi di passi
separati li aveva già fatti divergere una volta. **Non reintrodurre un elenco di passi nella CI.**

### 3.6 Font ospitati da noi, e il controllo dei glifi

I caratteri tipografici sono **ospitati dal sito** in sottoinsiemi ridotti (`unicode-range`), non
presi da un CDN. Niente Google Fonts, niente terze parti.

Il rischio di questa scelta: un carattere fuori dai sottoinsiemi **torna in silenzio al font di
sistema**, e nessuno se ne accorge finché non lo vede. Da qui `scripts/verifica-glifi.mjs`, che
attraversa i testi e segnala i caratteri non coperti.

### 3.7 La promessa sulla privacy, e come è verificata

Le pagine pubbliche **non contattano nessun servizio di terzi**, non impostano cookie, non usano
strumenti di statistica. Non è solo un'intenzione: è scritta nell'[informativa](https://cognitariatzone.org/privacy/)
e **verificata a ogni build**. `scripts/verifica-testi.mjs` segnala, fra le altre cose, un'immagine
il cui indirizzo punti a un altro sito — perché un'immagine remota fa arrivare l'IP del lettore a
quel sito, che è esattamente ciò che l'informativa promette di non fare.

### 3.8 La catena di verifica

```
npm run verify
  └─ build            astro build && genera:slug
  └─ check:all        astro check  +  tsc sulle Functions
  └─ check:glifi      caratteri fuori dai sottoinsiemi dei font
  └─ check:testi      segnaposto di bozza, testo attaccato al tag, immagini remote
  └─ check:cms        la config di Sveltia corrisponde alle raccolte del sito
  └─ test:functions   i tre checkout restano chiusi, senza chiamate di rete
```

Script non inclusi in `verify`, da lanciare a mano quando serve:

| Comando | A cosa serve |
|---|---|
| `npm run check:supabase` | stato dello schema remoto |
| `npm run check:cms-oauth` | il giro OAuth del CMS |
| `npm run check:produzione` | controlli sul sito pubblicato |

---

## 4. Contenuti e redazione

I contenuti sono **Astro Content Collections**: `src/content/articles` (5 articoli) e
`src/content/eventi` (5 eventi) [verificato 30/09], file Markdown con frontmatter validato da
**Zod** (`src/content.config.ts`).

La redazione scrive da **`/admin`** (Sveltia CMS) con il proprio account GitHub, che deve avere
**accesso in scrittura al repository**. Il giro OAuth passa dalle nostre due Functions
(`cms-auth.ts`, `cms-callback.ts`): non c'è un servizio esterno di autenticazione.

**Ogni salvataggio è un commit sul ramo di produzione, e ogni commit ricostruisce il sito** (un paio
di minuti).

Due regole nate da guasti veri, da ripetere a chi scrive:

1. **Le immagini si caricano, non si incollano.** Incollare l'indirizzo di un'immagine di un altro
   sito fa arrivare l'IP di chi legge a quel sito, e rompe la promessa dell'informativa. Il
   controllo `check:testi` lo intercetta, ma solo al rilascio successivo.
2. **Se una pubblicazione non compare, il problema non è il CMS.** Il salvataggio riesce sempre; può
   fallire la **build successiva**, e di quella dal CMS **non arriva nessun segnale**. Si guarda
   l'esito su Cloudflare Pages o nella scheda Actions di GitHub. Questa asimmetria — salvataggio
   sempre verde, build che può essere rossa e muta — è la trappola numero uno per la redazione.

3. **Se cambi una copertina, rileggi la descrizione.** Il testo alternativo resta quello di
   prima, e nessun controllo automatico può accorgersene: descrivere un'immagine richiede di
   guardarla. È già successo (§0.3).

Guida completa: `docs/redazione-cms.md`.

---

## 5. Infrastruttura esterna

### 5.1 Cloudflare Pages

| Impostazione | Valore | Dove è dichiarato |
|---|---|---|
| Build command | `npm run build` | `package.json` |
| Output directory | `dist` | `wrangler.toml` → `pages_build_output_dir` |
| Node | ≥ `22.12.0` | `package.json` → `engines` |
| Production branch | `feat/membership-v2-1` | pannello Cloudflare |

La CI su GitHub usa **Node 24** (`actions/setup-node@v5`; la v4 gira su Node 20, deprecato da GitHub
per le action).

### 5.2 Supabase — **[schema al 21/09; progetto verificato vivo il 30/09]**

- Progetto in regione **Central EU (Frankfurt)**, cioè nell'UE, come promette la sezione 6
  dell'informativa.
- **Registrazioni chiuse** (*Allow new users to sign up* disattivato). Si riaprono insieme al
  captcha, quando parte il tesseramento online.
- **5 tabelle**, tutte con **RLS attiva**: `member_profiles`, `memberships`, `privacy_acceptances`,
  `privacy_versions`, `stripe_events`.
- `member_profiles` **non contiene il codice fiscale** (rimosso): restano `id`, `first_name`,
  `last_name`, `created_at`.
- **2 job `pg_cron`**: `cleanup-unconfirmed-users`, `scadenze-dati-iscritti`.
- **Nessun utente registrato** (`count(*) from auth.users` = 0 al 21/09).
- 6 versioni dell'informativa registrate nel database, da `v1-2026-08-20` a `v6-2026-09-21`.
  **Il sito pubblica la v7**: la riga corrispondente la inserisce la migration 0009, non ancora
  eseguita. Finché l'iscrizione online è chiusa non cambia niente — nessuno può dichiarare di aver
  letto una versione — ma è esattamente il motivo per cui la 0009 va eseguita prima di riaprirla.

**Migration**: `supabase/migrations/0001` → `0009`. Le 0001–0008 sono eseguite. **La `0009` NO.**

> **`0009_informativa_v7.sql` va eseguita prima di riaprire le registrazioni online.** Registra la
> versione v7 dell'informativa fra quelle note al server, e il trigger introdotto dalla 0007
> **rifiuta una versione che non conosce**. Se si riaprono le iscrizioni senza averla eseguita, ogni
> tentativo di registrazione viene respinto dal database.

**Regola operativa**: nessuno script del repository tocca il database remoto. Le migration si
eseguono **a mano dall'editor SQL del pannello Supabase**. Il 21/09 le ha eseguite il committente,
non chi scrive il codice — e la regola «non applicare migration al database remoto» è stata superata
da quella decisione esplicita, non per prassi.

### 5.3 Stripe — predisposto e spento

Il codice c'è ed è stato rivisto; i tre checkout rispondono 503. Non risulta provisioning reale.

Architettura della parte pagamenti (Build 1.0, **congelata**: nessuna modifica architetturale prima
dei test su infrastruttura reale):

- quota 2026 **una tantum**, due fasce (studente, cognitario);
- contributo **sostenitore** con importo libero, minimo €50 (`custom_unit_amount`);
- **merch** (t-shirt, pin, poster), fase successiva;
- claim anti-concorrenza a tre livelli: **token UUID** + **compare-and-swap con `FOR UPDATE`** +
  **lease DB di 35 minuti contro il TTL Stripe di 30**;
- webhook **idempotente** (tabella `stripe_events`);
- stato `rejected` per la mancata accettazione da parte del direttivo.

Guida: `docs/guida-stripe.md`.

### 5.4 Turnstile

La **site key** è pubblica e sta in `.env` (`PUBLIC_TURNSTILE_SITE_KEY`). La **secret key non sta nel
nostro runtime**: si configura direttamente in Supabase (*Auth → Bot and Abuse Protection*). È il
motivo per cui non compare in `.dev.vars.example`. Chi cerca dove infilarla nel nostro codice non la
troverà, ed è corretto così.

### 5.5 DNS — **[verificato 30/09]**

Il cutover da GitHub Pages a Cloudflare **è avvenuto**. Stato attuale:

```
nameserver                 aarav.ns.cloudflare.com
                           sarah.ns.cloudflare.com
cognitariatzone.org        A      104.21.21.148 / 172.67.199.35        (Cloudflare)
www.cognitariatzone.org    A      104.21.21.148 / 172.67.199.35
                           AAAA   2606:4700:3031::ac43:c723 / 2606:4700:3037::6815:1594
_dmarc                     TXT    v=DMARC1; p=quarantine; adkim=r; aspf=r;
                                  rua=mailto:dmarc_rua@onsecureserver.net;
MX                         nessuno — il dominio non riceve posta
```

Il registrar resta **GoDaddy**; solo la gestione DNS è passata a Cloudflare.

> **Il DMARC è la trappola che aspetta il prossimo passo.** Il record è `p=quarantine` e **non ha il
> tag `sp=`**, quindi i sottodomini **ereditano la policy**. Quando si configurerà l'SMTP
> transazionale per i magic link di accesso (mittente tipo `mail.cognitariatzone.org`), **SPF e DKIM
> dovranno essere allineati, o le email di login finiscono in quarantena e nessuno riesce ad
> accedere**. L'allineamento dichiarato è `relaxed` (`adkim=r`, `aspf=r`), che è la condizione
> favorevole, ma va configurato comunque.
>
> Nota secondaria: i report aggregati (`rua`) vanno ancora a un indirizzo **GoDaddy**
> (`onsecureserver.net`), residuo della configurazione precedente. Innocuo, ma se qualcuno volesse
> leggere i report DMARC va cambiato.

---

## 6. Stato funzionale: cosa è vivo e cosa è spento

| Funzione | Stato | Perché |
|---|---|---|
| Sito pubblico, manifesto, articoli, agenda | **online** | — |
| CMS su `/admin` | **online** | — |
| Tesseramento **via bonifico** | **online** dal 24/09 | decisione del committente |
| Iscrizione **online** | **chiusa** | manca il provisioning e le delibere di §7 |
| Checkout Stripe (3) | **503** | `PAGAMENTI_ATTIVI` non è `"true"` |
| Webhook Stripe | attivo | per riconciliare pagamenti già avviati |
| Cancellazione account | **501** | vedi §6.1 |
| Registrazioni Supabase | disattivate dal pannello | si riaprono col captcha |

### 6.1 Le due cose volutamente bloccate

Non sono lavori incompleti: sono blocchi deliberati, in attesa di decisioni che non sono tecniche.

1. **`functions/api/account-delete.ts` risponde 501**, e nell'area riservata il pulsante è
   sostituito da una richiesta via email. Finché non è deciso cosa va conservato per obbligo
   contabile (§7), nessuna cancellazione automatica: cancellare senza saperlo è peggio che non
   cancellare.
2. **I tre checkout Stripe rispondono 503** perché `PAGAMENTI_ATTIVI` non è `"true"`, e le
   registrazioni su Supabase sono disattivate dal pannello. Si riaprono insieme, con il captcha,
   quando le questioni di §7 sono chiuse.

> **Due correzioni alla prima stesura di questo documento**, per chi l'avesse letta:
> il componente `MembershipSignup.astro` **non esiste più** — è stato rimosso in Fase 4 insieme al
> modulo di iscrizione, e con lui il checkbox di consenso provvisorio; e `src/pages/privacy.astro`
> **non contiene più campi `[…]` da compilare**: l'informativa è pubblicata, è alla versione **v7**
> ed è vera. Quello che manca dei dati dell'ente — sede legale e PEC — sta in
> `src/lib/associazione.ts` come stringa vuota, e finché è vuota **sul sito non compare niente**,
> né il dato né una nota che spieghi che manca.

### 6.2 Il tesseramento per bonifico — cosa ha cambiato oltre alla home

Deciso il 24/09: l'IBAN dell'associazione è pubblicato e la quota si versa con bonifico, mentre
l'iscrizione online resta chiusa.

**Una regola del progetto è cambiata**: valeva «nessun IBAN nel repository». L'IBAN sta ora in
`src/lib/associazione.ts`, con la motivazione scritta accanto: deve comparire sul sito, quindi non è
un segreto ma **un recapito**, e permette di *ricevere* denaro, non di prelevarlo. **Per chiavi,
token e credenziali la regola resta identica.**

Dettaglio di implementazione che vale la pena non rompere: il pulsante "copia" è **nascosto
nell'HTML e mostrato dallo script**, così senza JavaScript non appare — invece di apparire e non
funzionare. Copia con `navigator.clipboard`, e se il permesso è negato ripiega su selezione +
`execCommand` (la prima strada viene negata nel riquadro incorporato del browser, la seconda copia
lo stesso).

Pagine allineate alla decisione: informativa **v7** (nuovo punto 6.1 sul bonifico, la banca fra i
destinatari), condizioni di pagamento, footer, area riservata.

---

## 7. Questioni aperte, con il responsabile

| | Questione | Di chi è | Blocca |
|---|---|---|---|
| 1 | **Secret `SUPABASE_URL` e `SUPABASE_ANON_KEY`** su GitHub, per il keep-alive (§0.1) | tecnico — **subito** | il progetto Supabase rischia la pausa |
| 2 | **Retention matrix**: cosa si cancella, cosa si anonimizza, cosa si conserva | committente + commercialista | cancellazione account |
| 3 | **Base giuridica art. 9 GDPR**: la forma giuridica e le attività reali dell'ente rientrano nell'eccezione **9(2)(d)**? | legale / compliance | iscrizione online |
| 4 | **Elenco nominativo delle quote**: per la contabilità bastano gli estratti conto, o serve un elenco nominativo? Se serve, va tenuto **fuori** dal database delle iscrizioni (solo nome, anno, importo) e scritto nella sezione 6.6 dell'informativa | commercialista | sezione 6.6 informativa |
| 5 | **Sede legale e PEC** dell'ente, se esiste: finché `src/lib/associazione.ts` le ha vuote, non compaiono da nessuna parte | committente | niente: il sito è coerente anche senza |
| 6 | **Provisioning** Stripe, SMTP per i magic link, Turnstile | operativo | iscrizione online, pagamenti |
| 7 | **Allineamento SPF/DKIM** per il mittente dei magic link (§5.5) | tecnico | accesso degli iscritti |
| 8 | Eseguire **migration 0009** | tecnico | riapertura registrazioni |
| 9 | **Rimborso a 14 giorni** e **12 mesi di conservazione** dopo la scadenza: scritti sul sito come proposta operativa, mai deliberati | direttivo | niente oggi, ma sono promesse pubbliche |

La 2 e la 4 sono la stessa conversazione con il commercialista. La 3 è l'unica che potrebbe imporre
una modifica al modello dei dati, quindi conviene chiuderla prima di riaccendere qualunque cosa.

### Piano di test end-to-end, quando l'infrastruttura sarà reale

Ordine di priorità già concordato. I primi tre non si possono simulare in locale.

1. **Due checkout simultanei sullo stesso account** — chiude il claim anti-concorrenza, l'unica parte
   del codice mai eseguita contro un Postgres reale
2. Pagamento **carta** → `active`
3. Pagamento **SEPA** → `payment_pending` → `async_payment_succeeded` → `active`
4. **Sessione Stripe scaduta** → il nuovo checkout riparte correttamente
5. **Cambio fascia** → la vecchia Checkout Session viene invalidata (non deve restare pagabile con
   l'importo sbagliato)
6. **`rejected` + rimborso** → un webhook tardivo non riattiva l'iscrizione
7. **Turnstile contro l'API Auth di Supabase direttamente** — una `signInWithOtp` senza captcha
   valido deve essere rifiutata da Supabase stesso, non solo dal form
8. **Idempotenza webhook** — `stripe events resend` dello stesso `event.id`, non deve applicarsi due
   volte
9. **Ordine invertito** — `invoice` / `async_payment_succeeded` prima di
   `checkout.session.completed`: lo stato deve convergere comunque
10. **Cleanup utenti non confermati** — magic link mai cliccato, il job `pg_cron` lo rimuove dopo 48h
    senza righe orfane

---

## 8. Variabili d'ambiente

Tre ambienti, e la distinzione conta.

| Dove | File locale | Modello in Git | Chi le legge |
|---|---|---|---|
| Browser | `.env` | `.env.example` | Astro/Vite le **inlina al build** |
| Server | `.dev.vars` | `.dev.vars.example` | le Functions, da `context.env` a **runtime** |
| Produzione | — | — | pannello **Cloudflare Pages**, set Production e Preview separati |

**Pubbliche** (`PUBLIC_*`, finiscono nel bundle del browser, chiunque le legge — è previsto):
`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`,
`PUBLIC_PAGAMENTI_ATTIVI`.

**Solo server**: `PAGAMENTI_ATTIVI`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STUDENTE`, `STRIPE_PRICE_COGNITARIO`,
`STRIPE_PRICE_SOSTENITORE`, `STRIPE_PRICE_MERCH_TSHIRT`, `STRIPE_PRICE_MERCH_PIN`,
`STRIPE_PRICE_MERCH_POSTER`, `SITE_URL`.

Su Cloudflare le segrete vanno marcate **Encrypt**: dopo non sono più rileggibili nemmeno dal
pannello, si possono solo sostituire. **Tenerne copia in un password manager**, non altrove.

Le variabili `PUBLIC_*` sono lette **al momento della build**: cambiarle non ha effetto finché non si
rifà un deploy. Quelle server sono lette a runtime: cambiarle ha effetto sulla richiesta successiva.

**Secret su GitHub Actions** (separati da quelli Cloudflare): `SUPABASE_URL`, `SUPABASE_ANON_KEY`
per il keep-alive. **Oggi non configurati** — vedi §0.1.

---

## 9. Lavorare in locale

```bash
npm install
npm run dev       # http://localhost:4321 — Astro dentro wrangler pages dev
npm run preview   # wrangler pages dev ./dist — Cloudflare simulato sul build
npm run verify    # prima di ogni rilascio
```

Serve **Node ≥ 22.12**. `npm run dev` gira Astro **dentro** `wrangler pages dev`, così le Functions
esistono anche in locale e leggono `.dev.vars`.

Cartelle non versionate che troverai sul disco e che **non vanno committate**: `_local/` (note
operative, screenshot dei pannelli — il repo è pubblico), `generato/` (prodotta dalla build),
`dist/`, `.wrangler/`, `.astro/`, `node_modules/`.

---

## 10. Rollback

| Cosa è rotto | Rimedio | Tempo |
|---|---|---|
| Il sito pubblicato è difettoso | Cloudflare Pages → **Rollback to this deployment** su un deploy precedente | immediato |
| Un commit ha introdotto il difetto | `git revert` → Cloudflare ricompila | minuti |
| Un contenuto cancellato resta online | è la cache statica di Pages: **non** si risolve col purge, vedi §3.4 | — |
| DNS / Cloudflare irraggiungibile | i nameserver si possono riportare a GoDaddy (`ns23/ns24.domaincontrol.com`), ma **GitHub Pages è spento**: non c'è più un'origine alternativa pronta | ore |

**Mai `git reset --hard` o force push sui rami condivisi**: il CMS committa su produzione, e
riscrivere la cronologia sotto di lui genera conflitti che la redazione non può risolvere. Si usa
`git revert`.

**Cosa nessun rollback annulla**: pagamenti realmente incassati, email realmente partite, righe
scritte su Supabase. Il codice si riavvolge, il mondo esterno no.

Procedura completa: `docs/rilascio-e-ripristino.md`.

---

## 11. Documentazione: cosa è autorevole e cosa è scaduto

**Da leggere, aggiornati:**

| File | Contenuto |
|---|---|
| `docs/handoff.md` | **questo documento**: lo stato complessivo e le questioni aperte |
| `README.md` | la porta d'ingresso: rami, rilascio, verifiche, indice dei documenti. Riscritto il 24/09 |
| `docs/registro-fasi.md` | registro del lavoro, 2092 righe, cronologico. Ultima voce 24/09 |
| `docs/redazione-cms.md` | come si pubblica, e cosa fare quando non esce |
| `docs/rilascio-e-ripristino.md` | rilascio e ripristino |
| `docs/conservazione-dati.md` | per quanto si tengono i dati, e cosa resta da deliberare |
| `docs/guida-stripe.md` | dall'account Stripe al primo pagamento di prova |
| `docs/informativa-privacy-bozza.md` | bozza dell'informativa |
| `docs/dati-associazione.md` | dati dell'ente e da dove risultano |
| `docs/manuale-brand.md` | colori, caratteri, contrasti |
| `docs/copy-home-v2.md` | i testi della home e le regole che li governano |
| `docs/manifesto-verifiche-editoriali.md` | verifiche editoriali |
| `PROVISIONING.md` | provisioning dei servizi esterni |

**Superati — non usare come riferimento:**

| File | Perché |
|---|---|
| `STATO-BUILD-1.0.md` | fermo al 25/08, descrive il mondo **prima** del cutover. È tracciato in Git, quindi chi arriva da GitHub lo trova: il 30/09 gli è stato messo in testa un avviso che rimanda qui. Il contenuto resta come documento storico |
| `landing.md` | il file che ha aperto il thread tutorial di agosto. Non tracciato |
| `riassunto.md` | riassunto di quel thread, stato al 25/08, pre-cutover. Non tracciato. **Questo handoff lo sostituisce** |

Il piano tecnico originale sta in `C:\Users\web\.claude\plans\` — **solo in locale**, non nel
repository.

---

## 12. Come ci siamo arrivati, in breve

Serve a capire perché alcune cose hanno la forma che hanno.

Ad agosto il sito era un `index.html` monolitico servito da **GitHub Pages "legacy"**: file grezzi
del ramo `main`, nessuna build. In parallelo cresceva il ramo `feat/membership-v2-1` con la
migrazione ad Astro più iscrizione e pagamenti.

Quel ramo **non si poteva mergiare**: `main` avrebbe perso il suo `index.html` in root, e GitHub
Pages — che non esegue `astro build` — avrebbe smesso di servire il sito. Il merge non era sbagliato,
era **fuori ordine**.

La soluzione è stata cambiare hosting prima di cambiare sito, **separando le due cose** per sapere,
in caso di problema, quale delle due l'aveva causato. Cloudflare Pages è stato puntato direttamente
sul ramo di lavoro, aggirando il problema di `main` non compilabile; il DNS è passato a Cloudflare
mentre GitHub Pages restava acceso come rollback; **GitHub Pages è stato spento il 24/09** e la PR #2
chiusa senza merge, perché nel frattempo il suo contenuto era già in produzione per altra via.

`main` è rimasto com'era: l'archivio del sito di agosto.

Da lì il lavoro si è spostato sui contenuti (CMS, articoli, agenda), sull'irrobustimento (verifiche
automatiche, font ospitati, middleware anti-cache) e sul tesseramento per bonifico, tenendo
l'iscrizione online chiusa in attesa delle delibere di §7.

---

## 13. Accessi necessari per chi prende in mano

- **GitHub** `gattcocco/cognitariat` — scrittura (e *admin* per i secret e il ramo predefinito)
- **Cloudflare** — progetto Pages `cognitariat` **e** la zona DNS `cognitariatzone.org`
- **GoDaddy** — registrar, per i nameserver
- **Supabase** — progetto in Central EU
- **Stripe** — quando si aprirà il provisioning
- **Proton** — casella `cognitariatz@proton.me`

---

## 14. Verifica in dieci minuti che tutto sia vivo

```bash
cd "C:/Users/web/Desktop/Sito cognitariato/cognitariat-main/cognitariat-main"

git fetch --all
git rev-list --left-right --count origin/dev...origin/feat/membership-v2-1   # deriva CMS
gh repo view --json defaultBranchRef -q .defaultBranchRef.name               # feat/membership-v2-1
gh run list -L 5                                                            # CI verde?
gh secret list                                                              # §0.1: deve elencare i due SUPABASE_*
gh run view --log $(gh run list --workflow=supabase-sveglia.yml -L 1 --json databaseId -q '.[0].databaseId') | tail -5
npm ci && npm run verify                                                    # deve passare tutto
nslookup -type=NS cognitariatzone.org 8.8.8.8                               # nameserver Cloudflare
curl -s -o /dev/null -w '%{http_code}\n' https://cognitariatzone.org/       # 200
curl -s -o /dev/null -w '%{http_code}\n' https://cognitariatzone.org/api/checkout   # 503 = giusto
```

Poi, a mano: pannello **Supabase** (progetto attivo o in pausa?), pannello **Cloudflare Pages**
(ultimo deployment verde?), e `/admin` (il CMS fa entrare?).

---

## 15. Cosa è stato fatto il 30/09, chiudendo questo passaggio di consegne

Per non farlo cercare nei commit:

- **keep-alive corretto**: fallisce se i secret mancano o se Supabase non risponde 200, invece di
  uscire verde senza fare niente. Corretto anche il commento sul ramo predefinito;
- **`dev` riallineato** con i 4 commit che la redazione aveva scritto in produzione;
- **copertina e testo alternativo** dell'articolo sulla corsa all'AI: descrizione corretta,
  immagine da 310 KB a 128, nome senza spazi;
- **`STATO-BUILD-1.0.md`**: avviso in testa che rimanda qui;
- **questo documento** portato nel repository, in `docs/handoff.md`, con il rimando dal README.

E quello che **non** è stato fatto, di proposito: nessun secret inserito (li inserisce chi ha gli
accessi), nessuna migration eseguita sul database remoto, nessuna decisione presa al posto del
direttivo.

---

*Prima stesura 30/09/2026 da un thread di ricognizione; rivista e completata lo stesso giorno dal
thread che ha svolto il lavoro. Le parti marcate **[verificato 30/09]** sono state controllate
contro il repository, le API di GitHub, il DNS pubblico e le risposte del sito.*