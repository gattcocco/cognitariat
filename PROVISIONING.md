# Provisioning — Passo 1 (Turnstile → Supabase → Stripe → Cloudflare Pages)

**Fase**: Passo 1-2 della sequenza in [STATO-BUILD-1.0.md](STATO-BUILD-1.0.md) · **Stripe in modalità TEST**
· Nessun DNS toccato, nessun merge.

Ordine studiato per non dover tornare indietro: ogni servizio produce le chiavi che serviranno al
successivo. Le due eccezioni sono nel §5 — cose che si possono fare solo *dopo* aver conosciuto
l'URL `*.pages.dev`.

> **Nessun segreto va in questo file, né in nessun altro file del repo.** Il repo è pubblico.
> Le chiavi vanno solo nel pannello Cloudflare (marcate come cifrate) e in un password manager.

---

## 1. Turnstile — nessuna dipendenza, si fa per primo

Dashboard Cloudflare → **Turnstile** → *Add widget*.

- Nome: qualcosa di riconoscibile, es. `COG U — iscrizione`
- Modalità: **Managed** (default)
- Hostname: per ora non si conosce ancora l'URL del progetto Pages. Si può creare il widget e
  tornare ad aggiungere gli hostname al §5.

Produce due chiavi:

| Chiave | Dove va |
|---|---|
| **Site key** (pubblica) | variabile `PUBLIC_TURNSTILE_SITE_KEY` su Cloudflare Pages |
| **Secret key** | **dentro Supabase**, non nelle nostre variabili (vedi §2) |

La secret key non compare da nessuna parte nel nostro codice: è Supabase a verificare il token.
È voluto — vedi il ragionamento nel piano (il confine anti-abuso deve stare dentro Supabase,
altrimenti l'endpoint Auth resta aggirabile).

---

## 2. Supabase — progetto in regione UE

*New project* → **regione UE** (Frankfurt o Ireland). Piano free sufficiente per i test.

### 2.1 Chiavi da annotare

| Chiave | Variabile Cloudflare | Visibilità |
|---|---|---|
| Project URL | `PUBLIC_SUPABASE_URL` | in chiaro |
| `anon` / publishable key | `PUBLIC_SUPABASE_ANON_KEY` | in chiaro |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **cifrata** |

La `service_role` bypassa RLS: se finisce nel browser chiunque può leggere e scrivere qualsiasi
riga. Non deve mai comparire in una variabile con prefisso `PUBLIC_`.

### 2.2 Estensione `pg_cron`

*Database → Extensions* → abilitare **`pg_cron`**. Serve alla migration `0004`. Se non è abilitata
dal pannello, la `create extension` dentro la migration può fallire per permessi.

### 2.3 Migrazioni — SQL Editor, **in ordine numerico**

L'ordine non è opzionale: `0005` ridefinisce la funzione trigger creata da `0001`, e `0002` deve
esistere prima di `0006` che ci opera sopra.

- [ ] `0001_member_profiles.sql`
- [ ] `0002_memberships.sql`
- [ ] `0003_stripe_events.sql`
- [ ] `0004_cleanup_unconfirmed_users.sql` ← richiede `pg_cron` (§2.2)
- [ ] `0005_privacy_acceptances.sql`
- [ ] `0006_claim_membership_checkout.sql`

**Verifica rapida dopo l'esecuzione** (SQL Editor):

```sql
-- 4 tabelle attese: member_profiles, memberships, privacy_acceptances, stripe_events
select tablename from pg_tables where schemaname = 'public' order by tablename;

-- la funzione di claim deve esistere ed essere eseguibile dal service_role
select has_function_privilege('service_role',
  'public.claim_membership_checkout(uuid, text, uuid)', 'execute') as service_role_puo_chiamarla;

-- RLS attiva su tutte e quattro
select relname, relrowsecurity from pg_class
where relname in ('member_profiles','memberships','privacy_acceptances','stripe_events');

-- il job di pulizia esiste
select jobname, schedule from cron.job;
```

`service_role_puo_chiamarla` deve dare **true**. Se dà false il checkout fallirà con
*permission denied*: è il caso previsto dal commento in coda a `0006`.

### 2.4 Configurazione Auth

*Authentication → Providers → Email*: **abilitare** il magic link (passwordless). Non serve la password.

*Authentication → Bot and Abuse Protection*: attivare **Turnstile** e incollare la **secret key** del §1.

> **Verifica che conta più di tutte** (test 7 della checklist E2E): dopo averlo attivato, una chiamata
> diretta all'API Auth di Supabase **senza** captcha token deve essere **rifiutata**. Se passa, il
> widget sul form è decorativo e l'endpoint resta aperto agli abusi.

*Authentication → URL Configuration → Redirect URLs*: da compilare al §5, quando si conosce l'URL.

### 2.5 SMTP — da sapere, non da fare adesso

Per i test va bene l'SMTP integrato di Supabase. **Non è adatto alla produzione**: ha limiti di invio
molto bassi. Prima di aprire le iscrizioni serve un provider transazionale (Resend/Postmark/Brevo)
con SPF/DKIM allineati — e attenzione al DMARC `p=quarantine` già presente sul dominio
(vedi §5 di [STATO-BUILD-1.0.md](STATO-BUILD-1.0.md)), o le email di login finiscono in quarantena.

---

## 3. Stripe — modalità TEST

**Non serve completare la verifica dell'attività (KYC) per usare la modalità test.** Tutti i test di
questa fase si fanno in test mode; il KYC serve solo per incassare davvero, e lo fa il legale
rappresentante (vedi il piano: documenti d'identità e IBAN non passano da chi implementa).

Assicurarsi che il pannello sia in **Test mode** prima di creare qualsiasi cosa.

### 3.1 Prodotti e prezzi

Sei Price da creare, tutti **one-time** (non ricorrenti — la quota 2026 è un pagamento unico) e in **EUR**:

| # | Prodotto | Prezzo | Variabile |
|---|---|---|---|
| 1 | Quota associativa 2026 — Studentə/disoccupatə | € 10,00 fisso | `STRIPE_PRICE_STUDENTE` |
| 2 | Quota associativa 2026 — Cognitariə | € 20,00 fisso | `STRIPE_PRICE_COGNITARIO` |
| 3 | Contributo sostenitore | **importo scelto dal cliente**, minimo € 50,00 | `STRIPE_PRICE_SOSTENITORE` |
| 4 | Merch — T-shirt | a piacere (fase 2) | `STRIPE_PRICE_MERCH_TSHIRT` |
| 5 | Merch — Spilla/Pin | a piacere (fase 2) | `STRIPE_PRICE_MERCH_PIN` |
| 6 | Merch — Poster | a piacere (fase 2) | `STRIPE_PRICE_MERCH_POSTER` |

Per il **n. 3** va usata l'opzione *«Customer chooses price»* con importo minimo 5000 centesimi.
Se si crea come prezzo fisso, il bottone «Sostienici» incasserà sempre la stessa cifra.

I **n. 4-6** sono fase 2, ma i tre bottoni merch sono **già visibili sul sito**: senza i rispettivi
Price ID restituiscono errore 500. O si creano (anche con importi provvisori), o si mette in conto
che quei tre bottoni falliscano durante il Passo 2 — l'importante è non scambiarlo per un difetto.

### 3.2 Metodi di pagamento

*Settings → Payment methods* (in test mode): oltre alle carte, abilitare **SEPA Direct Debit**.
Senza, il test 3 della checklist E2E (pagamento asincrono → `payment_pending` →
`async_payment_succeeded`) non è eseguibile. Il codice non forza `payment_method_types`, quindi usa
i metodi abilitati nel pannello.

### 3.3 Chiave

*Developers → API keys* → **Secret key** (test, inizia per `sk_test_`) → variabile `STRIPE_SECRET_KEY`, **cifrata**.

Il webhook e il suo secret si creano al §5, quando esiste un URL a cui puntare.

---

## 4. Cloudflare Pages — creazione del progetto

*Workers & Pages* → *Create* → **Pages** → *Connect to Git* → repository `gattcocco/cognitariat`.

| Impostazione | Valore |
|---|---|
| **Production branch** | `feat/membership-v2-1` ← temporaneo e voluto, vedi §2 di STATO-BUILD-1.0 |
| Build command | `npm run build` |
| Output directory | `dist` |

### Variabili — ambiente **Production**

Sì, Production con chiavi di **test**: in questa fase il production branch *è* il branch di lavoro.
Si passerà alle chiavi live solo al Passo 6, dopo il cutover.

**In chiaro** (servono al build; finiscono comunque nel bundle del browser):

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_TURNSTILE_SITE_KEY`
- `NODE_VERSION` = `22` — `package.json` richiede `>=22.12.0`

**Cifrate** (lette solo dalle Functions a runtime):

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STUDENTE`, `STRIPE_PRICE_COGNITARIO`, `STRIPE_PRICE_SOSTENITORE`
- `STRIPE_PRICE_MERCH_TSHIRT`, `STRIPE_PRICE_MERCH_PIN`, `STRIPE_PRICE_MERCH_POSTER`
- `SITE_URL` → §5
- `STRIPE_WEBHOOK_SECRET` → §5

> ⚠️ **Se le `PUBLIC_*` mancano, il deploy risulta verde e il sito sembra a posto, ma l'iscrizione è
> morta.** Verificato: il build passa, la CI passa, la pagina si carica — e in console compaiono
> `supabaseUrl is required` e un errore Turnstile. Sintomo visibile: i bottoni delle fasce restano
> su «Iscriviti» invece di diventare «Accedi per iscriverti». Al primo deploy si guarda la **console
> del browser**, non l'aspetto della pagina.

---

## 5. Il secondo giro — le cose che richiedono l'URL

Dopo il primo deploy si conosce l'URL `https://<progetto>.pages.dev`. Quattro cose da chiudere,
poi **un nuovo deploy** (le variabili vengono lette al build: cambiarle non basta).

- [ ] **Cloudflare** → `SITE_URL` = l'URL pages.dev.
      Se resta puntato a `cognitariatzone.org`, dopo un pagamento di test Stripe rimanda al sito vecchio.
- [ ] **Supabase** → *Authentication → URL Configuration → Redirect URLs*: aggiungere
      `https://<progetto>.pages.dev/**`. Il magic link usa `location.origin` e si adatta da solo, ma
      Supabase rifiuta i redirect non in allowlist e il login non torna indietro.
- [ ] **Turnstile** → aggiungere l'hostname del progetto (e più avanti il dominio finale).
- [ ] **Stripe** → *Developers → Webhooks* → *Add endpoint*:
      - URL: `https://<progetto>.pages.dev/webhooks/stripe`
      - Eventi, esattamente i tre gestiti dal codice:
        `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
        `checkout.session.async_payment_failed`
      - Copiare il **signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET` su Cloudflare, cifrata.
        È **diverso** da quello che si userà in produzione: ogni endpoint ha il suo.

- [ ] **Redeploy** e ricontrollo della console.

---

## 6. Verifica del Passo 2

Prima i controlli che non richiedono un account:

- [ ] Console del browser **pulita** sulla home (nessun `supabaseUrl is required`, nessun errore Turnstile)
- [ ] I bottoni delle fasce mostrano **«Accedi per iscriverti»** — è la prova che il modulo Supabase
      è vivo e ha potuto controllare la sessione
- [ ] Il widget Turnstile compare nel form di iscrizione
- [ ] `/privacy` e `/account` si caricano; `/account` da sloggati dice «Devi accedere»
- [ ] `POST /api/checkout` senza autenticazione → **401** (non 404: il 404 significherebbe che le
      Functions non vengono eseguite affatto)
- [ ] `POST /webhooks/stripe` senza firma → **400**
- [ ] `POST /api/account-delete` → **501** (disabilitato di proposito)

Poi la checklist E2E completa del §3 di [STATO-BUILD-1.0.md](STATO-BUILD-1.0.md), a partire dal
**test di concorrenza sul checkout** — l'unica parte del codice mai eseguita contro un Postgres reale.
