# Guida Stripe — dall'account al primo pagamento di prova

Redatta il 21/09/2026. Serve a chi apre e configura l'account Stripe di COG U, e
a chi poi collega Stripe al sito.

**Regola che vale per tutta la guida: nessun dato bancario, nessuna chiave e
nessun segreto va scritto in questo repository, in chat o nei log.** L'IBAN si
inserisce solo nel pannello Stripe; le chiavi solo nel pannello Cloudflare.

---

## In breve: le quattro fasi

| Fase | Chi | Cosa | Sblocca |
|---|---|---|---|
| **1. Account** | legale rappresentante | apre l'account, verifica identità e conto | tutto il resto |
| **2. Prova** | chiunque abbia accesso | prodotti e chiavi **di test**, solo sulla preview `dev` | il primo pagamento finto |
| **3. Quota associativa** | tecnico + decisione del direttivo | Supabase, email del login, webhook | le iscrizioni vere |
| **4. Pagamenti veri** | direttivo | informativa, condizioni e rimborsi, chiavi **live** in produzione | l'apertura |

La fase 2 si può fare subito dopo la 1 e non tocca il sito pubblico. La 3 e la 4
hanno decisioni aperte, elencate in fondo.

---

## Fase 1 — Aprire l'account (legale rappresentante)

L'account lo deve aprire **il legale rappresentante**, o comunque chi può
dichiarare i dati dell'ente: Stripe verifica l'identità di una persona fisica
che risponde per l'associazione.

### Cosa tenere a portata di mano

- denominazione esatta: **COG U — Sindacato del Cognitariato**;
- **codice fiscale dell'ente**: `98031460151` (è pubblico, sta nel footer);
- sede legale, come da atto costitutivo;
- atto costitutivo e statuto in PDF: Stripe a volte li chiede in un secondo
  momento;
- documento d'identità valido del legale rappresentante, e il suo telefono;
- **IBAN intestato all'associazione**, non a una persona.

> **Controlla l'intestazione del conto prima di inserirlo.** Stripe accredita
> solo su un conto intestato all'ente che incassa. Un conto personale, anche del
> legale rappresentante, viene rifiutato o blocca i bonifici in uscita.

### Passaggi

1. Vai su **stripe.com/it** → *Inizia ora*. Registrati con un **indirizzo
   dell'associazione** (oggi `cognitariatz@proton.me`), non con una casella
   personale: l'account deve sopravvivere a chi lo ha aperto.
2. Attiva subito la **verifica in due passaggi** (*Impostazioni → Profilo
   personale → Sicurezza*), con un'app di autenticazione.
3. *Attiva pagamenti*, oppure il pulsante che il pannello mostra in alto:
   - **Paese**: Italia.
   - **Tipo di attività**: *Organizzazione non profit*. Se l'elenco non la
     propone con questo nome, scegli la voce per enti senza scopo di lucro,
     non «Persona fisica» e non «Società».
   - **Codice fiscale / identificativo fiscale**: quello dell'ente. La partita
     IVA solo se l'associazione ne ha una.
   - **Settore**: la voce per *associazioni e organizzazioni associative*.
     Quella sindacale, se compare.
   - **Descrizione dell'attività**, qualcosa come: *«Associazione sindacale
     senza fini di lucro. Incassiamo quote associative annuali e contributi
     volontari dei sostenitori.»*
   - **Sito web**: `https://cognitariatzone.org`.
   - **Dati del legale rappresentante** e caricamento del documento.
   - Se Stripe chiede **amministratori o titolari effettivi**: per
     un'associazione sono i componenti dell'organo direttivo come da statuto.
     Inseriscili solo nel pannello Stripe, mai nel repository.
4. **Conto per i bonifici**: qui si inserisce l'IBAN dell'associazione.
5. **Descrizione sull'estratto conto** (*Impostazioni → Dati pubblici*): è il
   nome che la persona vede sull'estratto della carta. Proposta: `COG U`, oppure
   `COGU SINDACATO` se Stripe chiede più caratteri. Nello stesso punto: email
   di assistenza e sito.

La verifica può chiudersi in pochi minuti o richiedere qualche giorno, se
Stripe chiede altri documenti. **La fase 2 non deve aspettare**: l'ambiente di
test funziona anche con la verifica in corso.

---

## Fase 2 — Prova sulla preview `dev` (niente soldi veri)

Si lavora nell'**ambiente di test** di Stripe: l'interruttore *Modalità test*,
oppure una *Sandbox*, a seconda della versione del pannello. Tutto quello che
si crea qui non incassa niente e non si vede dal sito pubblico.

### 2.1 Prodotti e prezzi

In *Catalogo prodotti → Aggiungi prodotto*, tre prodotti, tutti con **prezzo
singolo (una tantum), non ricorrente**:

| Prodotto | Prezzo | Variabile del sito |
|---|---|---|
| Quota associativa 2026 — Studentə / disoccupatə | 10,00 € | `STRIPE_PRICE_STUDENTE` |
| Quota associativa 2026 — Cognitariə | 20,00 € | `STRIPE_PRICE_COGNITARIO` |
| Contributo sostenitore | **il cliente sceglie l'importo**, minimo 50,00 € | `STRIPE_PRICE_SOSTENITORE` |

Gli importi sono quelli del codice (`src/lib/tiers.ts`) e della pagina. Se
cambiano, cambiano in tutti e due i posti.

Di ogni prezzo serve l'**ID**, quello che comincia per `price_…`: lo trovi
aprendo il prodotto. Il merch per ora resta fuori: non ha prezzi decisi.

### 2.2 Chiave API di test

*Sviluppatori → Chiavi API* → la **chiave segreta di test** (`sk_test_…`).

Meglio ancora una **chiave con restrizioni**: *Crea chiave con restrizioni*,
con il permesso di scrittura sulle *Checkout Sessions* e nient'altro. Se un
giorno trapelasse, potrebbe solo aprire pagine di pagamento.

### 2.3 Variabili su Cloudflare, solo in Preview

*Cloudflare → Workers & Pages → cognitariat → Settings → Variables and
Secrets*. Tutto nell'ambiente **Preview**, **non in Production**:

| Nome | Valore | Tipo |
|---|---|---|
| `STRIPE_SECRET_KEY` | la chiave `sk_test_…` (o `rk_test_…`) | **Secret** |
| `STRIPE_PRICE_SOSTENITORE` | `price_…` | testo |
| `STRIPE_PRICE_STUDENTE` | `price_…` | testo |
| `STRIPE_PRICE_COGNITARIO` | `price_…` | testo |
| `SITE_URL` | `https://dev.cognitariat.pages.dev` | testo |
| `PAGAMENTI_ATTIVI` | `true` | testo |

Le variabili si leggono al deployment, quindi dopo averle salvate serve un
nuovo deployment della preview (*Deployments → Retry deployment*
sull'ultimo di `dev`, o un push qualunque su `dev`).

**Le chiavi non passano dalla chat**: si incollano direttamente nel pannello.

### 2.4 Primo pagamento di prova: il contributo sostenitore

È il solo percorso che si può provare subito, perché non richiede account né
database. Il codice sta in `functions/api/checkout-sostenitore.ts`.

**Nella pagina oggi non c'è un pulsante che lo avvia**, di proposito: la
sezione Tesseramento dice che non si paga ancora, e nessun pulsante deve far
pensare il contrario. La prova tecnica si fa quindi chiamando direttamente la
funzione, che risponde con l'indirizzo della pagina di pagamento di Stripe:

```bash
curl -s -X POST https://dev.cognitariat.pages.dev/api/checkout-sostenitore
```

La risposta è `{"url":"https://checkout.stripe.com/…"}`: quell'indirizzo si
apre nel browser. Il pulsante vero, visibile solo quando i pagamenti sono
accesi, è un lavoro a parte da decidere prima della fase 4.

- Carta di prova: `4242 4242 4242 4242`, una scadenza futura qualsiasi, un CVC
  qualsiasi.
- Esito atteso: si torna su `https://dev.cognitariat.pages.dev/?sostegno=grazie`
  e il pagamento compare tra i *Pagamenti* di test su Stripe.
- Controllo del minimo: un importo sotto i 50 € deve essere rifiutato da
  Stripe stesso.

**Il sito pubblico resta chiuso** per tutta la fase: in Production
`PAGAMENTI_ATTIVI` non c'è, e i tre checkout rispondono 503.

### 2.5 Il webhook: non ancora

Il sito ha già il ricevitore degli eventi Stripe (`/webhooks/stripe`), ma
**scrive su Supabase**, che non è ancora configurato: le sue tabelle non sono
state create sul database remoto. Registrarlo adesso vorrebbe dire una
risposta di errore per ogni pagamento, e dopo qualche giorno Stripe disattiva
l'endpoint e manda email di allarme.

Per il contributo sostenitore non serve: il pagamento avviene lo stesso, e
tutto resta tracciato su Stripe. Si registra nella fase 3.

---

## Fase 3 — Quota associativa (serve prima Supabase)

La quota non è un pagamento anonimo: la persona entra con un link via email,
e la tessera si attiva quando arriva l'evento di Stripe. Servono:

1. **Supabase**: il progetto, e le migrazioni in `supabase/migrations/`
   applicate al database remoto. È una decisione esplicita, finora rinviata di
   proposito.
2. **Email del login** (magic link): un fornitore SMTP collegato a Supabase,
   con SPF/DKIM sul dominio. Il record DMARC c'è già.
3. **Turnstile**: la site key vera al posto di quella di prova.
4. **Webhook Stripe** (*Sviluppatori → Webhook*, oppure *Destinazioni eventi*):
   - URL: `https://dev.cognitariat.pages.dev/webhooks/stripe`
   - eventi: `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`
   - il **segreto di firma** (`whsec_…`) va in `STRIPE_WEBHOOK_SECRET`, sempre
     in Preview e come Secret.
5. Le variabili Supabase in Preview (vedi `.dev.vars.example`), poi
   `npm run check:supabase` con le credenziali vere.

Solo allora si prova una quota di test da capo a fondo: login, pagamento,
tessera attiva in `/account`.

---

## Fase 4 — Pagamenti veri

Da non fare finché non sono chiusi questi punti:

- **Informativa privacy**: la sezione 6 promette che i trattamenti legati ai
  pagamenti saranno descritti *prima* di raccogliere il primo dato. Va
  scritta: Stripe come fornitore, quali dati, per quanto tempo.
- **Condizioni e rimborsi**: oggi il sito non ha una pagina che dica se e come
  si rimborsa una quota o un contributo. Stripe la cerca quando rivede il sito,
  e chi paga ha diritto di saperlo. Il testo lo decide il direttivo.
- **Conservazione dei dati** (`docs/conservazione-dati.md`): la delibera è
  ancora da prendere.
- Chiavi e prezzi **live**, creati di nuovo nella modalità live, perché gli ID
  di test non valgono, e un webhook live sull'URL di produzione. Tutto
  nell'ambiente **Production** di Cloudflare, con `SITE_URL` =
  `https://cognitariatzone.org`.
- `PAGAMENTI_ATTIVI=true` in Production è l'ultimo interruttore, e si accende
  per ultimo.
