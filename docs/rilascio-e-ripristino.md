# Rilascio e ripristino — procedura breve

Due pagine, non venti. **Il cutover è fatto**, quindi questo documento non serve più a prepararlo:
serve a sapere com'è fatto il sito pubblico oggi, come ci si pubblica e come lo si rimette in piedi
in fretta se si rompe.

Il passaggio è avvenuto a settembre 2026, e da allora `main` non costruisce e non pubblica più
niente — lo dice il commento in `.github/workflows/ci.yml`, che indica il 24/09/2026. Tutto quello
che questo documento diceva al futuro («prima del cutover», «il giorno del cutover») è storia, e
ne resta una traccia in §6.

---

## 0. Com'è fatto il sito pubblico — verificato il 17/11/2026

| | |
|---|---|
| Progetto Cloudflare Pages | `cognitariat` |
| Ramo di produzione | **`feat/membership-v2-1`** — confermato, vedi §0.1 |
| Dominio pubblico | `cognitariatzone.org`, servito da **Cloudflare Pages** |
| DNS del dominio | nameserver di **Cloudflare**: `aarav.ns.cloudflare.com`, `sarah.ns.cloudflare.com` |
| `cognitariatzone.org` → A | `104.21.21.148`, `172.67.199.35` — anycast Cloudflare |
| `www.cognitariatzone.org` | risponde `301` verso l'apice |
| Anteprima | `dev.cognitariat.pages.dev`, ramo `dev` |
| Vecchio sito su GitHub Pages | **spento**: `gattcocco.github.io` risponde `404` |
| Chi pubblica gli articoli | il CMS, con un commit sul ramo di produzione |
| Pagamenti | spenti: i tre checkout rispondono `503` |

Il DNS non è più su GoDaddy: i nameserver sono di Cloudflare, quindi la zona si governa dal
pannello di Cloudflare. GoDaddy, se è ancora il registrar, conta solo per il rinnovo del dominio.
Altri documenti più vecchi dicono ancora il contrario: non credergli, e ricontrollare con il
comando qui sotto.

Per rimisurare tutto in un colpo:

```
node scripts/verifica-produzione.mjs https://cognitariatzone.org --produzione --ramo-cms feat/membership-v2-1
```

### 0.1 Il ramo di produzione non è più un'incognita

Per mesi qui c'era scritto «non confermato», perché la configurazione sta nel pannello di
Cloudflare e non nel repository, e dedurla da fuori era il modo sbagliato di saperla. Ora si deduce
da fuori in un modo che tiene, perché non guarda indizi ma effetti:

1. i commit del CMS (autore `CogUGIT`) arrivano su `feat/membership-v2-1`, e gli articoli che
   contengono sono online;
2. `check:produzione` dice che il sito dichiara `cognitariatzone.org` in canonical e in sitemap, e
   che l'indicizzazione è aperta. `BRANCH_PRODUZIONE` ha `main` come valore predefinito: se il ramo
   costruito fosse diverso da quello dichiarato nelle variabili, le pagine usciranno con `noindex`.
   Escono indicizzate, quindi ramo e variabili coincidono.

**Resta però un nome che inganna.** `feat/membership-v2-1` sembra un ramo di lavoro su una
funzionalità, ed è la produzione: era nato come ramo di feature e lo è rimasto nel nome. Chi arriva
nuovo pusha su `main` convinto di aggiornare il sito, e non succede niente. Rinominarlo non è un
gesto solo: vanno cambiati insieme il ramo di produzione del progetto Pages, `CMS_BRANCH`,
`BRANCH_PRODUZIONE` e i rami elencati nella CI. Non è urgente, ma è il primo tranello del repo.

## 1. Il collaudo — due minuti

```
npm run verify
node scripts/verifica-produzione.mjs https://cognitariatzone.org --produzione --ramo-cms feat/membership-v2-1
```

Il primo deve finire senza errori. Il secondo deve chiudersi con «Configurazione di produzione
coerente». L'equivalente sull'anteprima si lancia senza `--produzione`, e lì deve dire
**anteprima**: se dicesse «produzione», una variabile della preview è sbagliata.

**Chiamare `node` diretto, non `npm run check:produzione`.** Con npm il flag non arriva allo
script — `npm warn Unknown cli config "--produzione"` — e il collaudo gira aspettandosi
l'anteprima: boccia le tre cose che in produzione sono giuste (indicizzazione aperta, canonical e
sitemap sul dominio vero) e passa per buone quelle che non lo sarebbero. È un modo molto efficace
di spaventarsi per niente.

**Un falso positivo noto.** La riga `robots.txt  Disallow: / (chiuso)` compare anche quando il
robots è aperto: Cloudflare inserisce da sé un blocco gestito («Cloudflare Managed Content») con
decine di `Disallow: /` rivolti ai crawler di addestramento, e il controllo trova quelli. Il robots
vero è aperto — `Allow: /`, `Disallow: /admin/`, sitemap dichiarata. La riga che conta è quella
dopo: «robots.txt esclude /admin/».

## 2. Come si pubblica, oggi

Due strade, e non si incrociano.

**Contenuti → dal CMS.** Su `/admin/`. Chi scrive pubblica, Sveltia fa un commit sul ramo di
produzione, Cloudflare ricostruisce e il sito cambia. Nessuno tocca Git, e nessuno ha bisogno di
questa cartella: è così che sono arrivati i cinquanta e più articoli da ottobre a oggi.

**Codice → da qui.** Si lavora su un ramo, si lancia `npm run verify`, si porta il risultato su
`feat/membership-v2-1`. Quel push *è* il rilascio: non c'è nessun altro gesto da fare, e nessun
pannello da aprire.

Due cose da non fare: pushare su `main` credendo di aggiornare il sito, e usare «Retry deployment»
dal pannello per pubblicare — ricostruisce il commit vecchio, non prende quello nuovo (vedi
`docs/registro-fasi.md`).

## 3. Ripristino — se qualcosa va storto

**Non serve toccare il repository, e non serve fretta.** Cloudflare Pages tiene tutti i deployment
precedenti: nel pannello, alla voce dei deployment di produzione, si sceglie l'ultimo che
funzionava e si usa **Rollback**. Torna online in meno di un minuto, senza build.

Se invece il guasto è nella configurazione, i valori a cui tornare sono quelli del §0: ramo di
produzione `feat/membership-v2-1`, e le variabili dell'ambiente Production allineate allo stesso
ramo.

| Variabile | Valore |
|---|---|
| `CMS_BRANCH` | il ramo di produzione |
| `BRANCH_PRODUZIONE` | lo stesso ramo — senza, le pagine escono con `noindex` |
| `CMS_AUTH_BASE_URL` | `https://cognitariatzone.org` |
| `GITHUB_OAUTH_CLIENT_ID` / `_SECRET` | dell'applicazione OAuth del dominio vero |

`PAGAMENTI_ATTIVI` **non si tocca**: resta assente, e i tre checkout continuano a rispondere `503`.
Le variabili si leggono al build, quindi cambiarle senza ricostruire non fa niente.

**Cosa non si annulla con un rollback.** Un articolo pubblicato dal CMS è un commit nel
repository: il rollback rimette online la build vecchia, ma il commit resta. Se l'articolo non
doveva uscire, va tolto con un commit nuovo — non riscrivendo la cronologia.

Il dominio non va toccato in nessuno di questi passaggi: il rollback agisce sul deployment servito
dal progetto Pages, non su dove punta il DNS. È il motivo per cui è veloce.

**Una via di fuga che non c'è più.** Finché il cutover era da fare, il piano B era tornare al sito
precedente su GitHub Pages. Oggi quel sito è spento (`gattcocco.github.io` risponde `404`): dietro
non c'è niente. Le strade sono due — il rollback dentro Cloudflare, o un commit che annulla il
guasto — e nessuna delle due passa dal DNS.

## 4. La cache di bordo — com'è andata

Sull'anteprima la cache di Cloudflare ignorava le direttive dichiarate dal sito: un articolo
cancellato restava leggibile per giorni, e dal repository non c'era modo di correggerlo — provato
con `s-maxage=0`, `private` e `no-store`, tutti e tre serviti dalla cache con `CF-Cache-Status:
HIT`. `pages.dev` non è una zona dell'account, quindi lì la leva non esiste (vedi
`docs/registro-fasi.md` e i commenti in `public/_headers`).

**Sul dominio vero il difetto non si manifesta.** Misurato il 17/11/2026:

```
curl -sS -o /dev/null -w "%{http_code} %header{cf-cache-status} %header{cache-control}\n" https://cognitariatzone.org/
```

risponde `200 DYNAMIC public, max-age=0, must-revalidate`: le pagine HTML non vengono tenute al
bordo, e uno slug inesistente risponde `404` subito. Da fuori non si distingue se questo venga da
una *Cache Rule* nel pannello o dalla zona che rispetta l'origine, e la differenza conta solo per
chi va a toccare le impostazioni di caching: se lo fa, ricontrolli con il comando qui sopra che la
risposta non diventi `HIT`.

## 5. Cosa resta aperto

1. **`CNAME` è ancora nel repository**, sia su `main` sia sul ramo di produzione, con dentro
   `cognitariatzone.org`. Cloudflare Pages lo ignora: è il file con cui GitHub Pages rivendicava il
   dominio. Oggi GitHub Pages è spento, quindi non fa danni — ma se qualcuno lo riattivasse su
   `main`, due sistemi tornerebbero a credere di servire lo stesso nome. Si può togliere.
2. **Il nome del ramo di produzione** (§0.1).
3. **I pagamenti sono spenti**: `PAGAMENTI_ATTIVI` assente, e i tre checkout rifiutano lato server
   senza nemmeno una chiamata di rete. Accenderli è un rilascio a sé, con la sua verifica.
4. **`PROVISIONING.md` e `STATO-BUILD-1.0.md`** sono di agosto e settembre e descrivono il mondo
   pre-cutover. Chi li legge oggi trova un sito che non esiste più.

## 6. Com'eravamo arrivati qui

Fino a settembre 2026 il dominio era servito da **GitHub Pages**, dal ramo `main` di questo stesso
repository: record A di GitHub, DNS su GoDaddy, certificato GitHub in scadenza il 20/11/2026, e il
file `CNAME` che rivendicava il nome. Il sito nuovo viveva solo come anteprima su `pages.dev`.

Il cutover ha spostato tre cose insieme: la zona DNS a Cloudflare, il dominio sul progetto Pages, e
la produzione sul ramo `feat/membership-v2-1`. È scritto qui perché spiega i residui — il file
`CNAME`, i riferimenti a GoDaddy sparsi negli altri documenti — e perché la procedura dettagliata,
che non serve più, resta leggibile dove è giusto che stia:

```
git show 4ce947f:docs/rilascio-e-ripristino.md
```
