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
| **Copertina — Immagine** | **Obbligatoria.** Ogni articolo ha una copertina. Vedi sezione 5 per le dimensioni. |
| **Copertina — Testo alternativo** | **Obbligatorio.** Descrivi la copertina per chi non può vederla. Senza, il CMS non ti lascia salvare — non è un capriccio del programma, è l'unico modo perché quel campo non venga dimenticato. |
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
3. Su Cloudflare, nel progetto Pages, aggiungi **due** variabili:
   - `GITHUB_OAUTH_CLIENT_ID` — in chiaro;
   - `GITHUB_OAUTH_CLIENT_SECRET` — **cifrata**.

   `CMS_BRANCH` serve solo se il ramo non è `dev` (vedi §8), e `CMS_AUTH_BASE_URL` solo se
   l'indirizzo del login non è l'alias di ramo — che il sito ricava da sé.
4. Fai partire un nuovo deploy: le variabili si leggono al build, cambiarle non basta.
5. Controlla che sia andata, da terminale:

   ```
   npm run check:cms-oauth https://dev.cognitariat.pages.dev
   ```

   Legge la configurazione servita al CMS e avvia il login **senza completarlo**: dice se il
   client id è arrivato, se il permesso richiesto è quello giusto, se il ritorno previsto coincide
   con il callback registrato su GitHub e se il cookie di stato ha gli attributi di sicurezza.
   Finché la configurazione manca risponde 503 e ristampa questa lista. Non stampa segreti.

Dopo che risponde a posto, resta un ultimo passaggio a mano che nessuno script può fare: aprire
`/admin/`, entrare con GitHub, creare una bozza, salvarla, togliere la spunta «Bozza» e vedere
l'articolo comparire nel blog e in home dopo il deploy.

**Fatto sulla preview l'08/09/2026, dalla redazione e non da uno script.** Accesso con GitHub,
lettura del manifesto esistente, creazione e salvataggio di un articolo di prova, pubblicazione,
comparsa nel blog e nel richiamo in home, cancellazione dal CMS e sparizione dal sito. L'indirizzo
dell'articolo cancellato risponde **404** — verificato sull'intestazione HTTP, non a occhio.
Resta da rifare, identico, sul dominio pubblico dopo il cutover: è un'altra applicazione OAuth e
un altro ramo (§8).

Una parte non è stata esercitata e va detto: **il caricamento di un'immagine dal CMS**. L'articolo
di prova non aveva copertina, quindi il percorso «carico un file → finisce in
`public/images/articoli/` → si vede in pagina» non è ancora stato provato da nessuno. È la cosa da
fare al primo articolo vero con una foto — vedi §5.

Il segreto non va incollato in chat, non va messo in un file del repository e non compare nei
log: sta solo fra GitHub e le variabili cifrate di Cloudflare. Le due Function lo leggono a
runtime e non lo scrivono da nessuna parte — quando lo scambio con GitHub fallisce registrano il
tipo di errore, mai la risposta, che contiene la credenziale.

**Il permesso richiesto è `public_repo`**, non `repo`. È la differenza fra «può scrivere nei
repository pubblici» e «può leggere e scrivere in tutti i repository, anche privati, di chi fa il
login». Per pubblicare articoli su un repository pubblico serve solo il primo. Se un giorno
`gattcocco/cognitariat` diventasse privato, `public_repo` smetterebbe di funzionare e bisognerebbe
tornare a `repo`: è l'unico caso in cui alzarlo.

**Perché il callback è quello del ramo e non del deployment.** GitHub accetta un solo indirizzo
di callback per applicazione, mentre ogni deployment di Cloudflare ha un URL diverso
(`28ae1fe2.cognitariat.pages.dev`): con quello il login funzionerebbe per una build e si
romperebbe alla successiva. Il sito ricava da sé l'alias stabile del ramo
(`dev.cognitariat.pages.dev`) e lo dichiara al CMS; `CMS_AUTH_BASE_URL` resta come scavalco per
i casi fuori standard. In produzione servirà una seconda applicazione OAuth, con il dominio vero.

---

## 5. La copertina

**Ogni articolo ha una copertina.** È una decisione editoriale, presa il 09/09/2026, e nel modulo
si vede così: la copertina è un blocco sempre aperto con due campi, **entrambi obbligatori** —
l'immagine e la sua descrizione. Senza uno dei due il salvataggio non passa, e l'errore compare
accanto al campo mentre stai scrivendo.

Uno spazio non conta come descrizione: il campo viene ripulito prima di essere controllato, quindi
` ` vale come vuoto.

**Perché la descrizione non è un campo che si può saltare.** Un'immagine senza descrizione è
invisibile a chi usa un lettore di schermo. Prima era possibile metterne una e dimenticare
l'altra: il salvataggio riusciva, poi la costruzione del sito falliva con un messaggio che nessuno
in redazione va a leggere, e l'articolo semplicemente non compariva. Ora te lo dice il CMS, subito.

Sotto il campo resta l'aiuto: *«Descrivi la copertina per chi non può vederla.»*

### Come si scrive nel file

```yaml
copertina:
  file: /images/articoli/nome.webp
  alt: descrizione dell'immagine per chi non la vede
```

La forma vecchia — `cover:` e `coverAlt:` affiancati — **non è più valida** e fa fallire la
costruzione con un messaggio che spiega come sostituirla. Non è pignoleria: il CMS non conosce più
quei due nomi, e al primo salvataggio di quell'articolo li toglierebbe, facendo sparire la
copertina senza dirlo a nessuno.

### Il file

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
2. Cloudflare se ne accorge **da sola** e ricostruisce: ci vuole un minuto o due.
3. Se il controllo automatico trova un problema — per esempio un carattere che i nostri font non
   contengono — **la build fallisce e la preview resta com'era**. L'articolo è salvato su Git ma
   non va online finché il problema non è risolto. È voluto: meglio una preview vecchia che una
   rotta.

**Il punto 2 non richiede niente da parte tua.** Chi scrive articoli non deve entrare in
Cloudflare, mai: né per pubblicare, né per cancellare. Il commit del CMS fa partire da solo il
deployment corrispondente.

Verificato l'08/09/2026 sul collaudo reale: quattro commit fatti dal CMS — creazione,
due modifiche e cancellazione — hanno prodotto **quattro deployment automatici**, uno per commit,
senza nessun intervento manuale.

### «Retry deployment» non è il modo di pubblicare

Nel pannello di Cloudflare, accanto a ogni deployment, c'è un pulsante **Retry deployment**.
Serve a **ricostruire il commit di quel deployment**, cioè quello scritto nella sua riga: è
pensato per quando una build è fallita per una ragione passeggera.

Non porta online l'ultima versione. Se lo si preme su un deployment di ieri, si ricostruisce
ieri — e un articolo cancellato stamattina **ricompare**, perché nel commit di ieri c'era ancora.
È successo davvero durante il collaudo, ed è il motivo per cui questa sezione esiste.

Se una modifica del CMS non sembra arrivare online:

1. **aspetta un paio di minuti** — la build ci mette quel tanto;
2. guarda **l'elenco dei deployment**: in cima deve esserci il commit più recente, quello con il
   messaggio del tuo salvataggio. Se c'è ed è riuscito, sei a posto: svuota la cache del browser
   o ricarica con `Ctrl+F5`;
3. se in cima c'è un commit tuo ma la build è **fallita**, il problema è nel contenuto — quasi
   sempre una copertina senza testo alternativo (vedi sotto);
4. se il commit non c'è proprio, allora il CMS non ha salvato: rifai il salvataggio.

**Non premere Retry su un deployment vecchio per «forzare l'aggiornamento».** Fa l'opposto.

### La copertina senza testo alternativo: ora te lo dice il CMS

Era l'errore più facile da fare e il più scomodo da riconoscere: il salvataggio riusciva, il commit
partiva, la build falliva senza dirtelo e l'articolo non compariva. Dall'08/09/2026 non succede
più — il CMS blocca il salvataggio e mostra l'errore accanto al campo (§5).

Il controllo alla costruzione del sito **resta**, e non è un doppione: il CMS non è l'unico modo di
scrivere un file — si può sempre modificarlo a mano su Git — e una regola che vale solo
nell'interfaccia non è una regola.

---

## 7. Se qualcosa non va

**«Accesso al CMS non disponibile»** — la configurazione OAuth della sezione 4 non è stata
fatta, o le variabili non sono nell'ambiente giusto. Nel frattempo si può entrare con il token
personale.

**«Sessione di login non valida»** — il giro di login è stato interrotto o è passato troppo
tempo (il collegamento vale dieci minuti). Ricomincia dal pulsante.

**L'articolo non compare sul sito** — quasi sempre è l'interruttore *Bozza* ancora acceso.
Altrimenti guarda se l'ultima build di Cloudflare è fallita. Non usare *Retry deployment* per forzare
l'aggiornamento — ricostruisce il commit vecchio e riporta indietro il sito (§6).

**Un articolo cancellato è ricomparso** — prima di tutto: **non premere Retry deployment**, e non
serve svuotare niente a mano. Aspetta un paio di minuti e controlla dal terminale, non dal browser:

```
curl -sI https://dev.cognitariat.pages.dev/blog/<slug>/ | head -1
```

Deve dire `404 Not Found`. Ripetilo tre o quattro volte: la cache è distribuita su più nodi e una
sola richiesta può capitare su quello sbagliato.

Ricaricare la pagina nel browser non dice niente di utile, perché mescola la copia del browser a
quella del server: se vuoi guardare lì, aggiungi un parametro qualsiasi in fondo
(`?x=1`) — se con quello la pagina è sparita e senza no, era una copia conservata, non l'articolo.

**Dal 09/09/2026 questo non dovrebbe più capitare.** Il difetto era reale e stava nella
piattaforma: uno strato statico di Pages continuava a servire la pagina vecchia nonostante il
deployment corretto, e non lo raggiungeva né un'intestazione del sito né una regola di cache né
*Purge Everything*. Ora davanti a `/blog/` c'è un controllo che risponde 404 quando lo slug non è
fra gli articoli di questo deployment, e l'elenco lo scrive la build da sé. **Cancellare basta.**

Se dovesse ricapitare, il modo affidabile di verificarlo è **l'indirizzo del deployment**, quello
col codice davanti che trovi nel pannello o nel controllo su GitHub:

```
https://<codice>.cognitariat.pages.dev/blog/<slug>/
```

Quello non passa da nessuna cache condivisa e dice la verità. Il dettaglio, con le misure, sta in
`docs/registro-fasi.md`.

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

Per controllare che il passaggio sia riuscito, da terminale:

```
npm run check:produzione https://cognitariatzone.org --produzione --ramo-cms <ramo>
```

Dice se il sito si dichiara produzione o anteprima e se è coerente: indicizzazione, dominio in
canonical e sitemap, bozze fuori, ramo del CMS, stato del login e pagamenti ancora spenti. Lo
stesso comando senza `--produzione` va puntato alla preview, che deve dire «anteprima»: se
dicesse «produzione» vorrebbe dire che una variabile è già sbagliata.

## 9. Nota sulle terze parti

La pagina `/admin` carica il programma del CMS da `unpkg.com` e, mentre lavora, contatta
`cdn.jsdelivr.net` e `www.githubstatus.com`. Riguarda solo chi entra in redazione: **il sito
pubblico non contatta nessuno di questi**.

Dal 07/09/2026 il sito pubblico non contatta **nessuna** terza parte. I video di YouTube erano
l'ultima rimasta — erano incorporati in modalita' nocookie, ma bastava scorrere fino a quella
sezione perche' l'indirizzo IP di chi legge arrivasse a Google. Ora sono link: la richiesta parte
solo se qualcuno clicca, cioe' quando ha deciso di andare su YouTube.

La versione del CMS è fissata di proposito (`@sveltia/cms@0.206.1` in `public/admin/index.html`).
Prima era senza numero, cioè sempre l'ultima pubblicata: il programma che maneggia un token con
permesso di scrittura sul repository poteva cambiare da solo. Per aggiornarlo si cambia il
numero, deliberatamente.
