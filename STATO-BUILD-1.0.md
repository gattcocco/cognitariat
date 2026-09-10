# Stato Build 1.0 — nota di allineamento

**Aggiornato**: 2026-08-25 · **Branch**: `feat/membership-v2-1` · **PR**: #2 · **HEAD**: `754bd2d` (CI verde)

Questo documento sta **su git di proposito**, perché serve a chi rivede il codice da GitHub senza
accesso al repo locale. Sostituisce i riepiloghi passati a mano da una chat all'altra.

---

## 1. Il codice è chiuso, ma il merge non è il prossimo passo

La review sulla Build 1.0 è stata accolta: i tre blocker del claim anti-concorrenza sono chiusi
(token UUID + compare-and-swap con `FOR UPDATE` + lease DB 35 min contro TTL Stripe 30 min), più le
due protezioni aggiuntive su cambio fascia e salvataggio condizionato al token. CI verde su
`30d3797` e sull'attuale `754bd2d`. **Build 1.0 congelata**: nessuna altra modifica architetturale
prima dei test su infrastruttura reale.

### ⚠️ Però: mergiare la PR #2 adesso spegne il sito live

Questa è l'informazione che mancava a chi ha proposto «a questo punto: merge». Non è un'obiezione
al codice, è un vincolo dell'hosting attuale.

Stato verificato oggi via API GitHub:

```
GitHub Pages   build_type: "legacy"   source: { branch: "main", path: "/" }
               cname: cognitariatzone.org
```

`build_type: legacy` significa che **GitHub Pages consegna i file di `main` così come sono, senza
compilare niente**. Il sito live oggi è l'`index.html` che sta nella root di `main`.

Il commit `e905ee1` di questo branch **cancella quell'`index.html`** (giustamente: lo sostituisce
con un progetto Astro che va compilato con `astro build` per produrre `dist/`). Ma GitHub Pages non
esegue `astro build`, e non c'è nessun workflow che pubblichi `dist/`.

**Conseguenza diretta**: nel momento in cui la PR #2 entra in `main`, la root di `main` non ha più
un `index.html` e `cognitariatzone.org` smette di servire il sito.

Il merge non è sbagliato — è solo **fuori ordine**. Va fatto *dopo* che l'hosting è passato a
Cloudflare Pages, non prima.

---

## 2. Sequenza corretta

Il principio è separare **«cambiare hosting»** da **«cambiare sito»**, così se qualcosa va storto si
sa quale dei due l'ha causato.

| # | Passo | Effetto sul sito live |
|---|---|---|
| 1 | Progetto Cloudflare Pages ← repo, con **production branch = `feat/membership-v2-1`** (temporaneo) e variabili con **Stripe in TEST** | nessuno |
| 2 | Verifica completa su `*.pages.dev`: pagine + le 5 Functions | nessuno |
| 3 | Dominio su Cloudflare, nameserver GoDaddy → Cloudflare, dominio personalizzato + certificato | **cutover** |
| 4 | **Merge PR #2** | nessuno — Cloudflare sta seguendo il branch, non `main` |
| 5 | Production branch → `main` (ricompila contenuto identico) | nessuno |
| 6 | Configurazione post-cutover + pulizia | nessuno |

Il punto chiave è il **Passo 1**: puntare Cloudflare sul branch di lavoro invece che su `main`
aggira il problema di `main` non compilabile e trasforma il Passo 4 in un non-evento. Il merge
smette di essere l'atto che pubblica il sito.

Per tutto il Passo 3 GitHub Pages resta **acceso e integro**: è il rollback.

**Perché Cloudflare e non un workflow GitHub Actions**: la build da sola si potrebbe risolvere anche
su Actions, ma le Functions no. `functions/api/checkout.ts`, `checkout-sostenitore.ts`,
`checkout-merch.ts`, `account-delete.ts` e `webhooks/stripe.ts` usano `STRIPE_SECRET_KEY` e
`SUPABASE_SERVICE_ROLE_KEY`: devono girare server-side. GitHub Pages non esegue codice, sa solo
consegnare file. È un limite del servizio, non di configurazione.

---

## 3. Piano di test end-to-end (dopo il provisioning)

Ordine di priorità concordato. I primi tre sono quelli che non si possono simulare in locale.

1. **Due checkout simultanei sullo stesso account** — è il test che chiude il claim anti-concorrenza,
   l'unica parte del codice mai eseguita contro un Postgres reale
2. Pagamento **carta** → `active`
3. Pagamento **SEPA** → `payment_pending` → `async_payment_succeeded` → `active`
4. **Sessione Stripe scaduta** → il nuovo checkout riparte correttamente
5. **Cambio fascia** → la vecchia Checkout Session viene invalidata (non deve restare pagabile con
   l'importo sbagliato)
6. **`rejected` + rimborso** → un webhook tardivo non riattiva l'iscrizione

Da aggiungere ai sei sopra, perché toccano codice altrettanto non provato:

7. **Turnstile contro l'API Auth di Supabase direttamente** — non solo dal form: una chiamata a
   `signInWithOtp` senza captcha valido deve essere rifiutata da Supabase stesso, altrimenti il
   confine anti-abuso non esiste
8. **Idempotenza webhook** — rinviare lo stesso `event.id` (`stripe events resend`) e verificare che
   non venga applicato due volte
9. **Ordine invertito** — `invoice`/`async_payment_succeeded` prima di `checkout.session.completed`:
   lo stato deve convergere lo stesso
10. **Cleanup utenti non confermati** — magic link mai cliccato, il job `pg_cron` lo rimuove dopo 48h
    senza lasciare righe orfane

---

## 4. Cosa manca prima di aprire le iscrizioni al pubblico

Nessuna di queste è un blocco per il merge o per il cutover: sono blocchi per il **go-live** della
membership, che è deliberatamente rimandata a dopo il cambio di hosting.

| | Blocco | Natura |
|---|---|---|
| 1 | **Retention matrix** — cosa si cancella / anonimizza / conserva alla cancellazione account | contabile/legale, non tecnico |
| 2 | **Base giuridica art. 9 GDPR** — va verificato che la forma giuridica e le attività reali dell'ente rientrino nell'eccezione 9(2)(d) | legale |
| 3 | Provisioning reale di Supabase, Stripe, Turnstile, SMTP | operativo |
| 4 | Dati anagrafici dell'ente per completare `/privacy` (i campi `[…]`) | dal cliente |

Stato nel codice, di conseguenza:

- `functions/api/account-delete.ts` risponde **501** di proposito e il bottone in `/account` è
  sostituito da una richiesta via email — finché la retention matrix non esiste, nessuna
  cancellazione automatica.
- Il **secondo checkbox di consenso** (art. 9) in `MembershipSignup.astro` è marcato come
  provvisorio nel codice: la formulazione va confermata dopo la verifica legale.
- `src/pages/privacy.astro` ha un avviso in cima: **non pubblicabile così com'è**.

---

## 5. DNS — rilevato prima del cutover

Zona su GoDaddy, **10 record** (contatore del pannello, elenco completo):

| Categoria | Quanti | Al cutover |
|---|---|---|
| Sito: 4× `A` (IP GitHub Pages) + `CNAME www` | 5 | sostituiti da Cloudflare Pages |
| Zona: 2× `NS` + `SOA` | 3 | li rigenera Cloudflare |
| `TXT _dmarc` | 1 | **l'unico da riportare a mano** |
| `CNAME _domainconnect` | 1 | inerte dopo il cambio nameserver, si lascia cadere |

**Nessun record MX**: il dominio non riceve posta, confermato anche a voce dal cliente. È il motivo
per cui questa migrazione DNS è a basso rischio — non c'è una casella di posta da rompere.

Due cose da non perdere:

- **Il `TXT _dmarc` va ricreato su Cloudflare.** È `p=quarantine` senza tag `sp=`, quindi i
  sottodomini **ereditano la policy**. Quando si configurerà l'SMTP transazionale per i magic link
  (mittente tipo `mail.cognitariatzone.org`), SPF/DKIM dovranno essere allineati o **le email di
  login finiscono in quarantena e nessuno riesce ad accedere**. L'allineamento è `relaxed`, che è la
  condizione favorevole, ma va configurato.
- **I TTL sono di 1 ora** su NS, SOA, `CNAME www` e sul primo record `A` (gli altri tre `A` sono a
  600 s). La finestra di propagazione al Passo 3 va pensata in ore, non in minuti.

---

## 6. Dove sta il resto

- **Piano tecnico** (architettura, decisioni, GDPR): `C:\Users\web\.claude\plans\` — locale
- **Note operative e screenshot DNS**: cartella `_local/`, **non versionata di proposito** (il repo è
  pubblico, screenshot di pannelli di controllo non ci vanno)
- **Configurazione di build**, già dichiarata nel repo e non da inventare al setup Cloudflare:

  | Impostazione | Valore | Fonte |
  |---|---|---|
  | Build command | `npm run build` | `package.json` |
  | Output directory | `dist` | `wrangler.toml` → `pages_build_output_dir` |
  | Node | >= `22.12.0` | `package.json` → `engines` |

  `astro.config.mjs` è volutamente vuoto: sito **statico**, nessun adapter. Le rotte server vivono in
  `functions/` come Pages Functions native.
