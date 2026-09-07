# Scrivere sul sito — istruzioni per la redazione

Il CMS sta su **`/admin`** del sito (per esempio `https://dev.cognitariat.pages.dev/admin/`).
Serve a scrivere articoli senza toccare il codice: quello che salvi diventa un commit su Git, e
la preview si ricostruisce da sola.

Due cose da sapere prima di cominciare.

**L'accesso al CMS non è l'account membro.** Sono due mondi separati: qui si entra con GitHub,
perché scrivere un articolo significa scrivere nel repository. Il tesseramento, quando aprirà,
userà un'altra cosa (un link via email) e non darà accesso a questa pagina.

**Adesso il CMS scrive su `dev`**, il ramo della preview: il ramo che serve il sito pubblico non
è raggiungibile da qui, finché siamo in preparazione. Al rilascio si cambia una variabile e il
CMS scrive direttamente sul ramo pubblicato — da quel momento pubblicare non richiede più nessun
intervento tecnico. Come si fa è nella sezione 8.

---

## 1. Entrare

Il pulsante da usare è **«Sign In with GitHub»**. Perché funzioni serve che chi amministra il
sito abbia fatto la configurazione della sezione 4. Se non è ancora stata fatta, il pulsante
porta a una pagina che lo dice.

Nel frattempo c'è una seconda strada, prevista da Sveltia: **«Sign In Using Access Token»**. Si
crea un token personale su GitHub (*Settings → Developer settings → Personal access tokens →
Fine-grained tokens*), dandogli accesso al solo repository `gattcocco/cognitariat` con permesso
di lettura e scrittura sui contenuti, e lo si incolla nel CMS. Il token resta nel browser di chi
lo ha creato: non va scritto in nessun file, non va mandato in chat e non va condiviso. Se
qualcuno lascia la redazione, revoca il proprio token e ha finito.

Per entrare in un modo o nell'altro serve avere accesso in scrittura al repository. Chi lo
concede: chi amministra il repository su GitHub.

---

## 2. Scrivere un articolo

Dentro il CMS c'è una sola raccolta, **Articoli**. Il pulsante per crearne uno nuovo è in alto a
destra.

| Campo | Cosa metterci |
|---|---|
| **Titolo** | Come apparirà in cima all'articolo, nell'elenco e nell'anteprima quando qualcuno condivide il link. |
| **Bozza** | Acceso di default. Finché è acceso l'articolo **non esiste** per chi visita il sito. Vedi sezione 3. |
| **Data di pubblicazione** | Solo il giorno. Niente orario: con l'ora la data rischia di comparire spostata di un giorno. |
| **Firma** | Una persona, oppure `Editoriale` per un testo della redazione. |
| **Sommario** | Due o tre righe. Si legge nell'elenco, nel richiamo in home e nell'anteprima social. Non è l'inizio dell'articolo: è il motivo per aprirlo. |
| **Immagine di copertina** | Facoltativa. Vedi sezione 5 per le dimensioni. |
| **Testo alternativo della copertina** | **Obbligatorio se c'è la copertina.** Descrivi l'immagine per chi non la vede. Senza, il sito si rifiuta di costruire l'articolo — non è un capriccio del programma, è l'unico modo perché quel campo non venga dimenticato. |
| **Corpo** | Il testo. Si scrive in Markdown, ma l'editor ha i pulsanti per grassetto, corsivo, titoli, elenchi e link. |

Nel corpo si usano i **titoli di secondo livello** (`##`) per le sezioni: il primo livello è già
il titolo dell'articolo, metterne un altro confonde chi naviga con un lettore di schermo.

---

## 3. Bozza e pubblicazione

L'interruttore **Bozza** è quello che conta.

**Acceso** — l'articolo non compare nell'elenco `/blog`, non compare in home, non entra nella
mappa del sito, e la sua pagina non viene nemmeno creata: chi indovinasse l'indirizzo troverebbe
un 404. Vale anche sulla preview: stare su un ramo di lavoro non rende privato quello che è
online.

**Spento** — l'articolo è pubblico su tutto ciò che è costruito da quel momento in poi.

Chi lavora al sito può costruire una copia locale che mostra anche le bozze, per vedere il pezzo
davvero impaginato prima di pubblicarlo (`MOSTRA_BOZZE=true npm run build`). Quella copia gira
sul computer di chi la fa e non finisce online.

**Su un sito ospitato quella variabile non basta e viene ignorata.** Una preview su Cloudflare ha
un indirizzo pubblico: non chiede credenziali, e chiunque ce l'abbia può aprirla. Il `noindex`
tiene fuori i motori di ricerca, non le persone — sono due cose diverse, e solo un controllo
d'accesso rende privata una bozza. Se un giorno servirà una preview protetta si mette davanti
Cloudflare Access e lo si dichiara con `BOZZE_AMBIENTE_PROTETTO=true`; finché quella variabile
non c'è, su Cloudflare le bozze non vengono costruite, punto.

---

## 4. Configurazione OAuth — per chi amministra, una volta sola

Il login con GitHub ha bisogno di un'applicazione OAuth. Il segreto non sta nel codice: sta
nelle variabili del progetto Cloudflare, e le due Function `functions/api/cms-auth.ts` e
`functions/api/cms-callback.ts` lo usano lato server.

1. Su GitHub: *Settings → Developer settings → OAuth Apps → New OAuth App*.
   - **Application name**: `COG U CMS (preview)`
   - **Homepage URL**: `https://dev.cognitariat.pages.dev`
   - **Authorization callback URL**: `https://dev.cognitariat.pages.dev/api/cms-callback`
2. Genera un **client secret** e copialo subito (GitHub non lo rimostra).
3. Su Cloudflare, nel progetto Pages, aggiungi quattro variabili:
   - `GITHUB_OAUTH_CLIENT_ID` — in chiaro;
   - `GITHUB_OAUTH_CLIENT_SECRET` — **cifrata**;
   - `CMS_AUTH_BASE_URL` = `https://dev.cognitariat.pages.dev`;
   - `CMS_BRANCH` = `dev` (vedi §8 per il rilascio).
4. Fai partire un nuovo deploy: le variabili si leggono al build, cambiarle non basta.

Il segreto non va incollato in chat, non va messo in un file del repository e non compare nei
log: sta solo fra GitHub e le variabili cifrate di Cloudflare. Le due Function lo leggono a
runtime e non lo scrivono da nessuna parte — quando lo scambio con GitHub fallisce registrano il
tipo di errore, mai la risposta, che contiene la credenziale.

**Il permesso richiesto è `public_repo`**, non `repo`. È la differenza fra «può scrivere nei
repository pubblici» e «può leggere e scrivere in tutti i repository, anche privati, di chi fa il
login». Per pubblicare articoli su un repository pubblico serve solo il primo. Se un giorno
`gattcocco/cognitariat` diventasse privato, `public_repo` smetterebbe di funzionare e bisognerebbe
tornare a `repo`: è l'unico caso in cui alzarlo.

**Perché `CMS_AUTH_BASE_URL`.** GitHub accetta un solo indirizzo di callback per applicazione, e
ogni deployment di Cloudflare ha un URL diverso (`28ae1fe2.cognitariat.pages.dev`). La variabile
fissa l'indirizzo stabile del ramo, così il giro del login torna sempre nello stesso posto.
Quando il sito passerà in produzione servirà una seconda applicazione OAuth, con il dominio
vero, e la variabile impostata di conseguenza nell'ambiente di produzione.

---

## 5. Immagini

Le immagini caricate dal CMS finiscono in `public/images/articoli/` e sono raggiungibili da
`/images/articoli/…`.

Prima di caricarne una, **rimpiccioliscila**. Una copertina larga 1200 pixel basta e avanza: il
file originale della prima copertina pesava 3,3 MB e ridotto ne pesa 225 KB, cioè quindici volte
meno, senza differenze visibili in pagina. Su una connessione lenta è la differenza fra una
pagina che si apre e una che si aspetta.

Formati: **WebP** per la pagina. Se vuoi che la copertina si veda bene anche quando qualcuno
condivide il link, tieni accanto un **JPEG con lo stesso nome**: il sito lo usa da solo per
l'anteprima social, perché non tutti i servizi gestiscono il WebP.

Gli originali a piena risoluzione restano fuori dal repository: si conservano in locale, come i
file di lavoro.

---

## 6. Cosa succede dopo che salvi

1. Il CMS fa un commit su `dev` con un messaggio del tipo `Articolo: aggiorna "…"`.
2. Cloudflare se ne accorge e ricostruisce la preview: ci vuole un minuto o due.
3. Se il controllo automatico trova un problema — per esempio una copertina senza testo
   alternativo, o un carattere che i nostri font non contengono — **la build fallisce e la
   preview resta com'era**. L'articolo è salvato su Git ma non va online finché il problema non
   è risolto. È voluto: meglio una preview vecchia che una rotta.

---

## 7. Se qualcosa non va

**«Accesso al CMS non disponibile»** — la configurazione OAuth della sezione 4 non è stata
fatta, o le variabili non sono nell'ambiente giusto. Nel frattempo si può entrare con il token
personale.

**«Sessione di login non valida»** — il giro di login è stato interrotto o è passato troppo
tempo (il collegamento vale dieci minuti). Ricomincia dal pulsante.

**L'articolo non compare sul sito** — quasi sempre è l'interruttore *Bozza* ancora acceso.
Altrimenti guarda se l'ultima build di Cloudflare è fallita.

**La copertina non si vede quando condivido il link** — manca il JPEG accanto al WebP
(sezione 5).

---

## 8. Al rilascio: come si allineano CMS e ramo pubblicato

Oggi il CMS scrive su `dev`, che è il ramo della preview. Quando il sito passerà in produzione il
ramo pubblicato sarà un altro, e **se il CMS continuasse a scrivere su `dev` la redazione
pubblicherebbe nel vuoto**: l'articolo verrebbe salvato, la preview si aggiornerebbe, il sito
pubblico no. Nessun messaggio d'errore, solo un articolo che non compare.

Perché non succeda, il ramo non è scritto nel codice ma in una variabile, `CMS_BRANCH`. Al
cutover si cambia lì, insieme alle altre due che riguardano l'ambiente:

| Variabile | Oggi (preview) | Al rilascio |
|---|---|---|
| `CMS_BRANCH` | `dev` | il ramo che serve il sito pubblico |
| `BRANCH_PRODUZIONE` | non impostata | lo stesso ramo, così le pagine non escono con `noindex` |
| `CMS_AUTH_BASE_URL` | `https://dev.cognitariat.pages.dev` | il dominio pubblico |

Servirà anche una **seconda applicazione OAuth** su GitHub, con Homepage e callback sul dominio
vero: GitHub accetta un solo indirizzo di callback per applicazione, quindi quella della preview
non può servire anche la produzione.

Fatto questo, la redazione pubblica da sola: scrive nel CMS, toglie la spunta «Bozza», salva. Il
resto — commit, build, messa online — succede senza che nessuno tocchi niente a mano. È il punto:
dopo il rilascio non deve più servire un intervento tecnico per mandare online un articolo.

## 9. Nota sulle terze parti

La pagina `/admin` carica il programma del CMS da `unpkg.com` e, mentre lavora, contatta
`cdn.jsdelivr.net` e `www.githubstatus.com`. Riguarda solo chi entra in redazione: **il sito
pubblico non contatta nessuno di questi**, e gli unici servizi esterni che tocca sono i video
YouTube.

La versione del CMS è fissata di proposito (`@sveltia/cms@0.206.1` in `public/admin/index.html`).
Prima era senza numero, cioè sempre l'ultima pubblicata: il programma che maneggia un token con
permesso di scrittura sul repository poteva cambiare da solo. Per aggiornarlo si cambia il
numero, deliberatamente.
