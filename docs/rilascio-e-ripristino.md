# Rilascio e ripristino — procedura breve

Due pagine, non venti. Serve nel momento in cui si passa il sito pubblico da quello vecchio a
questo, e nel momento — sempre possibile — in cui bisogna tornare indietro in fretta.

**Niente di quanto segue è stato eseguito.** Il ramo `dev` è una preview, la produzione è ancora
quella di prima.

---

## 0. Prima di cominciare: cosa c'è adesso

| | |
|---|---|
| Progetto Cloudflare Pages | `cognitariat` |
| Ramo di produzione | **non confermato** — vedi §5 |
| Dominio pubblico | `cognitariatzone.org`, **oggi servito da GitHub Pages**, non da Cloudflare — vedi §0.1 |
| Ramo in lavorazione | `dev`, preview su `https://dev.cognitariat.pages.dev` |
| Pagamenti | spenti (`PAGAMENTI_ATTIVI` non impostata) |
| Iscrizioni | chiuse: il modulo non esiste |

## 0.1 Il dominio non è su Cloudflare (verificato l'08/09/2026)

Va scritto qui perché cambia la forma del cutover, e la procedura di ieri lo dava per scontato
nel modo sbagliato.

Stato rilevato, da riverificare il giorno del cutover perché è l'unica cosa qui che può cambiare
senza che nessuno ce lo dica:

| Cosa | Valore |
|---|---|
| `cognitariatzone.org` → A | `185.199.108.153`, `.109.153`, `.110.153`, `.111.153` — sono di **GitHub Pages** |
| `cognitariatzone.org` → AAAA | nessuno |
| `www.cognitariatzone.org` → CNAME | `gattcocco.github.io` (risponde 301) |
| Intestazione `Server` della risposta | `GitHub.com` |
| Nameserver del dominio | `ns23.domaincontrol.com`, `ns24.domaincontrol.com` — **GoDaddy** |
| GitHub Pages del repository | attivo, sorgente **ramo `main`**, cartella `/`, dominio personalizzato `cognitariatzone.org`, HTTPS forzato |
| Certificato GitHub | copre `cognitariatzone.org` e `www.`, scade il **20/11/2026** |
| File `CNAME` nel repository | `cognitariatzone.org` — è così che GitHub Pages rivendica il dominio |

Cioè: **Cloudflare oggi non è nel percorso del sito pubblico** e non gestisce il DNS. Il sito
online è quello vecchio, servito da GitHub Pages dal ramo `main` di questo stesso repository.

### Cosa comporta, in concreto

1. **Il dominio è rivendicato da GitHub Pages**, tramite il file `CNAME` su `main`. Finché resta
   così, GitHub continua a considerarlo suo. Spostarlo su Cloudflare senza toccare GitHub lascia
   due sistemi che pensano entrambi di servire lo stesso nome: funziona lo stesso — comanda il DNS
   — ma è una configurazione che nessuno ricorderà fra sei mesi.
2. **Serve decidere del vecchio sito.** Resta acceso su `gattcocco.github.io` come rete di
   sicurezza, e per quanto? Oppure si disattiva GitHub Pages? Sono due scelte diverse: la prima
   tiene una copia raggiungibile del sito vecchio, la seconda no.
3. **`www` va gestito insieme all'apice.** Oggi è un CNAME a GitHub che risponde 301. Se si sposta
   solo l'apice, `www` continua a portare al sito vecchio.
4. **Il certificato di GitHub scade il 20/11/2026.** Non è una scadenza per il cutover — dopo lo
   spostamento il certificato lo fa Cloudflare — ma è la data oltre la quale il vecchio sito, se
   lo si lascia acceso sul dominio, smetterebbe di rinnovarlo.

### La finestra di sovrapposizione

Fra il cambio dei record su GoDaddy e la propagazione c'è un intervallo in cui i due siti
convivono, e chi arriva vede l'uno o l'altro a seconda del resolver. **Non è un problema da
evitare: è un problema da restringere.** Abbassare il TTL dei record del dominio (a 300 secondi)
qualche ora *prima* del cutover riduce quella finestra da ore a minuti, e si può rialzare dopo.
Va fatto prima, non durante: abbassarlo al momento del cambio non serve, perché i resolver hanno
già in cache il valore vecchio con il TTL vecchio.

**Tutto questo è fuori dal perimetro di adesso** — è una modifica al DNS. È scritto qui perché è
un passaggio del rilascio, non un dettaglio, e perché le prime due decisioni non sono tecniche.

## 1. Prima del cutover — tre minuti

```
npm run verify
npm run check:produzione https://dev.cognitariat.pages.dev --ramo-cms dev
```

Il primo comando deve finire senza errori. Il secondo deve dire **anteprima**, e deve passare
tutto tranne — finché l'OAuth non è configurata — il login del CMS. Se dicesse «produzione»,
qualcosa nelle variabili è già sbagliato: fermarsi lì.

Poi, a occhio, sulla preview: la home, un articolo, `/privacy`, e `/admin/` con un accesso vero.

## 2. Il cutover

Nessuno di questi passaggi è nel repository: sono nel pannello di Cloudflare, tranne il DNS che è
su GoDaddy (§0.1). **Prima di cambiare qualsiasi cosa, annotare i valori attuali**: ramo di
produzione, variabili, record DNS. Senza quelli il ripristino del §4 diventa una ricostruzione.

1. **Ramo di produzione** del progetto Pages → il ramo che deve servire il sito pubblico.
2. **Variabili** del progetto (ambiente Production):

   | Variabile | Valore |
   |---|---|
   | `CMS_BRANCH` | lo stesso ramo di produzione |
   | `BRANCH_PRODUZIONE` | lo stesso ramo — senza, le pagine escono con `noindex` |
   | `CMS_AUTH_BASE_URL` | `https://cognitariatzone.org` |
   | `GITHUB_OAUTH_CLIENT_ID` | della **seconda** applicazione OAuth, quella del dominio vero |
   | `GITHUB_OAUTH_CLIENT_SECRET` | idem, cifrata |

   `PAGAMENTI_ATTIVI` **non si tocca**: resta assente, e i tre checkout continuano a rispondere 503.
3. **Seconda applicazione OAuth** su GitHub, con Homepage `https://cognitariatzone.org` e callback
   `https://cognitariatzone.org/api/cms-callback`. GitHub accetta un solo callback per
   applicazione: quella della preview non può servire anche la produzione.
4. **Nuovo deploy.** Le variabili si leggono al build: cambiarle senza ricostruire non fa niente.
5. **Regola di cache sulle pagine.** Non e' facoltativa. Sull'anteprima
   (`dev.cognitariat.pages.dev`) la cache di bordo di Cloudflare ignora le direttive che il sito
   dichiara: un articolo cancellato resta leggibile per giorni, e non c'e' modo di correggerlo dal
   repository — provato con `s-maxage=0`, `private` e `no-store`, tutti e tre serviti dalla cache
   con `CF-Cache-Status: HIT` (vedi `docs/registro-fasi.md` e i commenti in `public/_headers`).
   `pages.dev` non e' una zona dell'account, quindi lì la leva non c'e'. **Sul dominio
   dell'associazione sì**: nel pannello di Cloudflare, *Caching → Cache Rules*, una regola che per
   le richieste di pagine HTML (percorso che finisce con `/` o con `.html`) imposti *Bypass cache*,
   oppure *Respect origin TTL* con l'intestazione del sito. In produzione questo difetto significa
   un articolo ritirato che resta online per giorni: lì non e' una prova, e' un articolo vero.

   Da verificare subito dopo, pubblicando e cancellando un articolo di prova:

   ```
   curl -s -o /dev/null -w "%{http_code}
" https://cognitariatzone.org/blog/<slug>/
   ```

   Ripetuto una decina di volte, deve dire sempre `404`.

6. **Dominio personalizzato e DNS** (§0.1). È l'ultimo passaggio, non il primo: prima si verifica
   che la build di produzione sia giusta, poi le si manda il dominio. Nell'ordine:
   a. abbassare il TTL dei record su GoDaddy, qualche ora prima;
   b. aggiungere `cognitariatzone.org` (e `www`) come dominio personalizzato del progetto Pages;
   c. cambiare i record su GoDaddy secondo quello che Cloudflare indica;
   d. decidere del vecchio sito su GitHub Pages — lasciarlo acceso su `gattcocco.github.io` o
      disattivarlo — e, se si disattiva, togliere anche il file `CNAME` da `main`;
   e. rialzare il TTL quando è tutto stabile.

## 3. Subito dopo — due minuti

```
npm run check:produzione https://cognitariatzone.org --produzione --ramo-cms <ramo>
npm run check:cms-oauth https://cognitariatzone.org
```

Deve dire **produzione**: indicizzazione aperta, `Disallow: /admin/`, sitemap dichiarata sul
dominio vero, canonical sul dominio vero, nessuna bozza, ramo del CMS giusto, login configurato,
tre checkout ancora 503.

Poi un articolo di prova pubblicato dal CMS e cancellato: è l'unica verifica che dimostra che la
redazione può lavorare da sola.

## 4. Ripristino — se qualcosa va storto

**Non serve toccare il repository, e non serve fretta.** Cloudflare Pages tiene tutti i deployment
precedenti: nel pannello, alla voce dei deployment di produzione, si sceglie l'ultimo che
funzionava e si usa **Rollback**. Torna online in meno di un minuto, senza build.

Il ripristino completo è in tre gesti, nell'ordine:

1. **Rollback del deployment** — il sito torna a quello di prima.
2. **Ramo di produzione** riportato al valore che aveva prima — che va **letto e annotato prima**
   di cambiarlo, insieme ai valori precedenti delle variabili. È l'unico modo per tornare indietro
   senza tirare a indovinare, e oggi quel valore non è confermato (§5).
3. **Variabili** riportate ai valori di prima: `CMS_BRANCH` a `dev`, `BRANCH_PRODUZIONE` rimossa,
   `CMS_AUTH_BASE_URL` all'alias della preview.

**Cosa non si annulla con un rollback.** Un articolo pubblicato dal CMS è un commit nel
repository: il rollback rimette online la build vecchia, ma il commit resta. Se l'articolo non
doveva uscire, va tolto con un commit nuovo — non riscrivendo la cronologia.

Il dominio non va toccato in nessuno di questi passaggi: il rollback agisce sul deployment servito
dal progetto Pages, non su dove punta il DNS. È il motivo per cui è veloce.

**Ma attenzione al verso.** Il rollback riporta indietro il sito *dentro* Cloudflare. Se il
problema si manifesta dopo il cambio di DNS (§0.1) e la scelta è tornare al sito precedente, quello
non sta su Cloudflare: sta su GitHub Pages, e ci si torna rimettendo i record DNS di prima. È un
passaggio diverso, con i tempi di propagazione del DNS invece di un minuto.

## 5. Il ramo di produzione — **non confermato**

`PROVISIONING.md` e `STATO-BUILD-1.0.md` dichiarano `feat/membership-v2-1`, definito «temporaneo e
voluto». È documentazione interna, scritta ad agosto: dice cosa era stato impostato allora, non
cosa è impostato adesso.

Il 07/09 avevo aggiunto qui un'osservazione sulla forma dei controlli che Cloudflare pubblica su
GitHub — quali deployment mostrano un *Branch Preview URL* e quali no — e ne avevo tratto che
`main` si potesse escludere. **Non regge, e l'ho tolta.** Quei controlli dicono cosa Cloudflare ha
costruito e dove l'ha messo; non dicono quale ramo il progetto abbia configurato come produzione,
e l'assenza di un controllo su un ramo può avere altre cause — impostazioni di build, esclusioni,
semplicemente nessun push da quando l'integrazione è attiva. Dedurre una configurazione
dall'assenza di una riga è lo stesso errore di dedurla dall'uguaglianza di due pagine.

**Quindi: sconosciuto.** Nessun ramo è escluso, `main` compreso. Si legge dalla configurazione, e
in un modo solo:

```
npx wrangler login
npx wrangler pages project list
```

oppure aprendo il progetto nel pannello, alla voce del ramo di produzione. Serve un accesso
all'account Cloudflare, che chi scrive non ha.

**Perché non è un dettaglio.** `BRANCH_PRODUZIONE` ha `main` come valore predefinito. Se il ramo di
produzione reale è un altro e la variabile non viene impostata, il sito pubblico esce con
`noindex` e nessuno se ne accorge finché non sparisce dai motori di ricerca. Il controllo
`check:produzione` lo intercetta subito dopo il cutover — è per questo che va eseguito.
