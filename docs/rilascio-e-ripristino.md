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
| Ramo di produzione | `feat/membership-v2-1` — vedi §5 |
| Dominio pubblico | `cognitariatzone.org` |
| Ramo in lavorazione | `dev`, preview su `https://dev.cognitariat.pages.dev` |
| Pagamenti | spenti (`PAGAMENTI_ATTIVI` non impostata) |
| Iscrizioni | chiuse: il modulo non esiste |

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

Nessuno di questi passaggi è nel repository: sono tutti nel pannello di Cloudflare.

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
2. **Ramo di produzione** riportato a `feat/membership-v2-1`, se era stato cambiato.
3. **Variabili** riportate ai valori di prima: `CMS_BRANCH` a `dev`, `BRANCH_PRODUZIONE` rimossa,
   `CMS_AUTH_BASE_URL` all'alias della preview.

**Cosa non si annulla con un rollback.** Un articolo pubblicato dal CMS è un commit nel
repository: il rollback rimette online la build vecchia, ma il commit resta. Se l'articolo non
doveva uscire, va tolto con un commit nuovo — non riscrivendo la cronologia.

Il dominio non va toccato in nessuno di questi passaggi: il DNS punta al progetto Pages, non a un
deployment. È il motivo per cui il rollback è veloce.

## 5. Il ramo di produzione — cosa sappiamo e cosa manca

`PROVISIONING.md` e `STATO-BUILD-1.0.md` dichiarano `feat/membership-v2-1`, definito «temporaneo e
voluto». Al 07/09/2026 questo trova conferma nei dati che Cloudflare pubblica da sé sul
repository, senza bisogno di entrare nel pannello:

| Ramo | Cosa scrive Cloudflare nel proprio controllo su GitHub |
|---|---|
| `dev` (`e82643c`) | *Preview URL* **e** *Branch Preview URL* (`dev.cognitariat.pages.dev`) — la forma di un deployment di anteprima |
| `feat/membership-v2-1` (`428b5b5`) | solo *Preview URL*, **nessun** *Branch Preview URL* — la forma di un deployment di produzione, che vive sull'indirizzo del progetto e non ha un alias di ramo |
| `main` (`f7bb999`) | nessun controllo di Cloudflare: non viene costruito |

Non è la stessa cosa che leggerlo nella configurazione, ed è bene dirlo: è la deduzione dalla
**forma** dei deployment, non dal campo «Production branch». Va confermato con

```
npx wrangler login
npx wrangler pages project list
```

oppure aprendo il progetto nel pannello. Serve un accesso all'account Cloudflare, che chi scrive
non ha. **Quello che si può già escludere è `main`**: e conta, perché `BRANCH_PRODUZIONE` ha come
valore predefinito `main`, e lasciarlo tale al cutover manderebbe online il sito con `noindex`.
