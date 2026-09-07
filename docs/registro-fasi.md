# Registro delle fasi — rilancio COG U senza pagamenti

Branch di integrazione: **`dev`** · Obiettivo: online con nuova grafica e nuovi testi, pagamenti
in pausa ma architettura Stripe conservata e pronta.

---

## Fase 1 — Protezione del materiale e baseline

**Stato: completata.** Pipeline verde.

### Modifiche

- Creato il branch **`dev`** da `feat/membership-v2-1` (18 commit avanti a `main`, contiene tutto
  lo scaffolding Astro + Functions + migrazioni). Non da `main`, che non è compilabile.
  `main` e `feat/membership-v2-1` non sono stati toccati.
- Asset e certificati spostati da `dist/asset/` a `_local/licenze-e-originali/`, organizzati per
  prodotto con il rispettivo certificato dentro la cartella del prodotto.
- `.gitignore` esteso: `font/`, `**/license_certificate_*.pdf`, `_local/licenze-e-originali/`.
- `dist/asset/` rimosso dall'output pubblico.
- Inventario in `_local/licenze-e-originali/INVENTARIO.md` (fuori da Git).

### Controlli eseguiti

| Controllo | Esito |
|---|---|
| Copia archivio, conteggio | 126 → 126 file |
| Copia archivio, `sha256` per file | 126/126 identici |
| Copertura per contenuto prima della rimozione da `dist/` | 114 contenuti distinti, tutti in archivio |
| Certificati/originali tracciati in Git | **nessuno** |
| Certificati/originali nella cronologia (`--diff-filter=A`, tutti i branch) | **nessuno** — nessuna riscrittura necessaria |
| Esclusione `.gitignore` verificata con `git check-ignore` | font, certificati e archivio esclusi; `public/images/` resta tracciabile |
| `npm ci` da lockfile | ok |
| `npm run check:all` | **0 errori, 0 warning** |
| `npm run build` | ok, 4 pagine |
| `dist/asset` ricreato dal build? | no — era materiale collocato a mano, non output |

### Mappa del codice

**Pagine** (4): `index`, `account`, `privacy`, `auth/callback`.

**Componenti** (16, 639 righe): `Hero`, `Header`, `Footer`, `Banners`, `AssemblyBanner`,
`ContractSupport`, `Imaginarium`, `Legal`, `Strike`, `Advocacy`, `VideoInterviews`,
`AssembliesNews`, `OrganizerCta`, `Membership` (129), `MembershipSignup` (153), `Merch`.

**Functions** (5): `api/checkout`, `api/checkout-sostenitore`, `api/checkout-merch`,
`api/account-delete`, `webhooks/stripe`.

**Protezioni senza Stripe già presenti**: solo `api/account-delete`, che risponde `501` in modo
incondizionato. **Non esiste alcun feature flag.**

**Criticità rilevata per la Fase 5**: in `api/checkout.ts` l'ordine è
`requireUser` → `getSupabaseAdmin` + `getStripe` → **scrittura DB** (`claim_membership_checkout`)
→ solo dopo `sessions.create`. Senza chiavi Stripe valide oggi si otterrebbe: prenotazione scritta
a database, poi errore 500 su Stripe, con un claim `pending` che blocca l'utente per 30 minuti.
La Fase 5 deve spostare il gate **prima** di qualsiasi inizializzazione e scrittura.

### Questioni aperte

1. **🔴 Licenze registrate a un progetto diverso dal sito.** I certificati Envato Elements
   autorizzano l'uso *«as part of one specific project»*; il progetto registrato è **«social»**
   (4 item) o **«Envato»** (2 item), mai il sito. Prima del go-live pubblico gli item vanno
   riscaricati registrandoli a un progetto dedicato al sito. Non blocca il lavoro su `dev`,
   blocca la pubblicazione.
2. **🔴 Font non incorporabile finché non verificato.** `DoodleLines` resta solo locale: prima di
   un `@font-face` va verificato che la licenza copra il web embedding.
3. **🟠 Un pacchetto è senza certificato.** `student-characters-doodle-illustration` — il
   certificato `DE48QCJRK2` è intestato a «Astonished and Surprised People Set», item diverso.
   Messo da parte in `_ESCLUSO-senza-certificato/`, da non usare.
4. **🟠 Il README dice «branch da `main`»**, ma `main` non è compilabile. Da aggiornare quando la
   struttura si stabilizza.

### Aggiornamento post-fase — licenze risolte (2026-09-05)

Il committente ha riscaricato le licenze registrandole al progetto **«Cognitariato sito»**.
Verificati tutti e 8 i nuovi certificati: progetto corretto su ognuno. Conseguenze:

- Il blocco n. 1 (licenze su progetto sbagliato) è **chiuso** per 7 prodotti su 9.
- Il blocco n. 3 è **chiuso**: `K24X65ZGBW` è intestato proprio a «Student Characters Doodle
  Illustration» (autore `slabdsgn`), quindi il pacchetto è rientrato dall'esclusione.
- Restano **due pacchetti non riscaricati**: «Funny Grumpy Animals Doodle Illustration Set» e
  «Grumpy People Doodle Character Set», ancora registrati a «social»/«Envato». Non vanno usati
  finché non sono ri-tesserati. In alternativa c'è «Grumpy Pets Doodles», stesso autore, regolare.
- Il blocco n. 2 (font) **resta aperto**: la licenza è ora corretta, ma l'incorporamento via
  `@font-face` va ancora verificato nei termini Envato.
- Contenuto artistico dei pacchetti riscaricati verificato identico a quello già in archivio
  (`sha256` escludendo i certificati).

---

## Fase 2 — Riscrittura dei contenuti

**Stato: completata.** Pipeline verde (`check:all` 0 errori, `build` ok).

### Consegna

`docs/copy-home-v2.md` — copy completo per 8 sezioni + hero, ciascuna con id, titolo, corpo, CTA
unica, stato (attività attuale / progetto), fonti con data e ruolo dell'illustrazione.

### Identità ibrida

Ogni sezione dichiara se descrive **attività attuale** o **progetto**. L'osservatorio non sostituisce
il sindacato: la sezione 5 racconta cosa esiste (osservatorio, lettura dei testi di legge,
divulgazione), la 6 dichiara apertamente come *progetto non ancora attivo* libreria clausole, rete
avvocatə, archivio casi e contrattazione collettiva — che oggi il sito presenta invece come servizi
disponibili.

### Fact-checking — il lavoro principale della fase

Il brief chiedeva esplicitamente di non dare per verificati i propri esempi. Verificati con fonti
puntuali: MANGOS (composizione, origine BofA/Vivek Arya, 3 su 6 private), depositi ETF alla SEC,
Irlanda 22% (CSO), richieste Terna, ddl 1821, comitato di Bornasco.

**Una affermazione del brief è risultata smentita**: «Lombardia 65-70% delle richieste italiane».
I dati Terna al 31/07/2026 danno **~47%** (44,96 GW su 95,86), con la quota lombarda in calo e il
Piemonte secondo. Nel copy è diventato «quasi metà».

**Non verificate, quindi fuori dal copy**: rapporto energetico 7B vs 175B parametri (10-30×);
Minne Atairu, Ameera Kawash, Indigenous Data Sovereignty; acqua e falde; Arcene/Bollate come
progetti specifici.

**Da confermare dal committente**: l'appuntamento «ogni mercoledì al Ponte della Ghisolfa» — non
verificabile dall'esterno, nel copy la riga è generica in attesa di conferma.

### Verifiche non disponibili

- **Lettura ad alta voce**: è un controllo umano, non eseguibile da qui. Il copy è scritto per
  reggerla (frasi corte, una idea per frase) ma va provata.
- **Link e ancore**: verificabili solo in Fase 4, a integrazione avvenuta.

### Decisioni ancora necessarie

1. Conferma o smentita dell'appuntamento settimanale (§7 questioni aperte del copy).
2. Se elencare i dossier dell'osservatorio per titolo, servono i link a quelli pubblicati.
3. Footer: la riga «GDPR compliant · crittografia end-to-end» e «PRD v1.0» vanno riviste.
4. Navigazione: proposta di togliere Membership e Merch dalle voci principali, coerentemente col
   fatto che non sono operativi. Le sezioni restano nel sito.

---

## Fase 3 — Sistema visivo e campionario accessibile

**Stato: completata.** `check:all` 0 errori, `build` ok.

### Modifiche

- **`src/styles/tokens.css`** (nuovo): unica fonte per colori, tipografia, raggi, focus.
  Importato in `BaseLayout` prima di `global.css`.
- **`global.css`**: eliminati tutti i 27 colori hardcoded. Sabbia e beige rimossi da pagina,
  sezioni e card; fondo principale bianco.
- **Componenti**: rimossi i 10 colori inline, sostituiti da token.
- **`docs/manuale-brand.md`** (nuovo).
- **`_local/campionario/`** (fuori dal repo): campionario con titoli, testo, link, pulsanti,
  form con errore, tre esempi illustrati, prova dello schwa.

### Controlli eseguiti

| Controllo | Esito |
|---|---|
| Rapporti di contrasto dichiarati nel brief | **tutti e 6 verificati esatti** (calcolo WCAG 2.1) |
| Audit automatico contrasti su home renderizzata | 5 problemi trovati → **0 residui** |
| Audit su `/privacy` | 0 problemi |
| Overflow orizzontale a 360 px | nessuno |
| Overflow orizzontale a 390 px | nessuno |
| Console | nessun errore |
| Selettori dell'animazione d'ingresso | tutti presenti |
| `prefers-reduced-motion` + gate `html.cogu-intro` | intatti |
| Campionario e font nella build pubblica | **assenti** (verificato su `dist/`) |
| `check:all` / `build` | 0 errori |

### Problemi trovati e corretti

1. **Tutto l'H1 diventava rosa.** L'animazione avvolge ogni parola in `<span>`, facendo scattare la
   regola pensata per la sola parola chiave. Corretto con `span:not(.cogu-w)`.
2. **Banner rosa con testo bianco** (4,13) e link giallo su rosa (2,85): entrambi sotto soglia.
   Passati a nero, con il link distinto da peso e sottolineatura.
3. **`.price small`** ereditava il rosa: a 14px sul fondo giallino stava a 3,79.
4. **Bordo dei campi di form** a 1,38:1, contro il 3:1 richiesto da WCAG 1.4.11. Nuovo token
   `--bordo-campo` a 3,35:1.
5. **Tessera membro** con testo bianco su rosa e `opacity: 0.75` sulle etichette: entrambi sotto
   soglia. Ora testo nero, distinzione col peso invece che con la trasparenza.
6. **Testo grigio su fondo nero** in `.imaginarium .section-sub` e `.cogu-intro-tag`, e pallini
   dello slideshow a 2,4:1 su nero.
7. **Errore mio nel verso dell'hover**: avevo scurito il rosa (`#C22A58`), che col testo nero
   scende a 3,77. Corretto schiarendolo (`#E84B79`, 5,71).

### Verifiche non disponibili

- **Lettura con screen reader** e prova reale da tastiera su dispositivo fisico: non eseguibili
  da qui. Il focus è implementato e visibile, ma va provato.
- **Zoom 200%/400%**: non simulabile in modo affidabile con gli strumenti disponibili; la
  checklist è nel campionario.
- **Rendering dello schwa nei fallback reali** su Windows/macOS/Linux: il campionario ha la prova,
  va guardata su almeno due sistemi.

### Decisioni ancora necessarie

1. ~~**Incorporamento web di Doodle Lines**~~ — **parzialmente chiuso** (2026-09-05). La Envato
   Elements License lo **consente** esplicitamente: *«You can incorporate a web-enabled Font as
   part of an End Product, but your End Product must not encourage or facilitate users to extract
   the Font or create new text using it.»*
   Ne discendono tre vincoli implementativi: pubblicare **solo WOFF2** (non `.ttf`/`.otf`, che
   sarebbe facilitare l'estrazione), nessuno strumento che generi testo in quel font, uso limitato
   alle annotazioni.
   **Resta però aperto un punto**: la stessa licenza dice che il font può essere usato solo dallə
   sottoscrittorə e non trasferito ad altri, «even another person within the same company or a
   client». Il licenziatario è una persona fisica, il sito è dell'associazione. Da chiarire prima
   di pubblicare il font — non prima di lavorarci. Finché non è chiaro, il sito usa il fallback.
2. **Ritaglio delle illustrazioni**: i PNG sorgente sono verticali fino a 532×1114 con molto
   bianco. Vanno ritagliati ed esportati per il web prima della Fase 4.

---

## Fase 4 — Integrazione di testi e personaggi

Data: 2026-09-05. Ramo: `dev`. Nessun deploy, nessun merge, nessuna modifica DNS, nessuna
attivazione Stripe.

### Cosa è cambiato

**Struttura della home.** L'ordine editoriale di `docs/copy-home-v2.md` è ora quello del sito:
`#cosa-succede`, `#perche-ci-preoccupa`, `#lavoro`, `#alternative`, `#cosa-facciamo`, `#video`,
`#cosa-costruiamo`, `#avvicinarsi`, `#immaginario`, `#membership`, `#merch`. Le àncore storiche
`#contract-support`, `#advocacy`, `#legal`, `#strike` sono conservate come `span` dentro le sezioni
che oggi contengono quei contenuti, così i link già in giro non finiscono nel vuoto.

**Identità ibrida.** Sindacato *e* osservatorio in titolo, sottotitolo, metadati, JSON-LD, footer.
Le sezioni distinguono con un'etichetta cosa è attività in corso e cosa è progetto: `.occhiello`
per la prima, `.occhiello--progetto` (bordo tratteggiato, non solo colore) per la seconda.

**Illustrazioni.** Tre presenze in tutta la home, come da indicazione: nessuna sequenza di schede
decorate. In questa fase è entrata la prima figura (`#lavoro`), esportata come SVG con `viewBox`
ritagliato sul contenuto misurato con `getBBox()` — nessun ritaglio automatico del corpo, nessuna
perdita di dettaglio. Gli originali restano in `_local/`, fuori da Git e dal deploy.

**Pagamenti fermi.** In `#membership` e `#merch` non esiste alcun pulsante d'acquisto: verificato a
DOM che gli unici elementi cliccabili nelle due sezioni sono un'àncora interna. I prezzi restano
come informazione. `hasOfferCatalog` resta rimosso dai dati strutturati. Il codice Stripe
(Functions, migrazioni) è intatto per la riattivazione.

**Footer riscritto.** Diceva due cose non vere: «Sindacato del Cognitariato» da solo nascondeva
l'osservatorio, e «GDPR compliant · dati residenti UE · crittografia end-to-end» era una promessa
tecnica che il sito non può mantenere né dimostrare. Sostituita da un link semplice all'informativa.
Rimosso anche un blocco che stampava due virgolette vuote.

**Area membro.** Ora distingue tre stati invece di due: sessione assente, tessera caricata,
**errore di caricamento**. Il testo per chi non ha una sessione non manda più a una pagina
d'iscrizione che non esiste più e non promette un tesseramento chiuso.

### Problemi trovati e corretti in questa fase

1. **L'intro poteva lasciare la pagina senza titolo.** Il failsafe di 3 secondi toglieva la classe
   `html.cogu-intro` ma non l'overlay né l'`opacity` inline messa sulle parole dell'H1: con la
   timeline bloccata (scheda in background, rAF sospesi, CDN lenta) restava un titolo invisibile
   sotto un pannello nero orfano. Osservato dal vivo. Ora il failsafe rimuove l'overlay e riporta
   hero e parole allo stato finale, e viene riprogrammato oltre la durata reale della timeline
   (~3,7 s) quando anime.js parte davvero, così non taglia più l'animazione a metà.
2. **Il focus cambiava forma agli elementi.** La regola di focus imponeva `border-radius: 4px`: i
   pulsanti pillola diventavano squadrati nel momento in cui ricevevano il focus. Rimosso.
3. **Mancava il salto al contenuto** (WCAG 2.4.1): da tastiera si attraversavano ogni volta due
   banner e sette voci di menu. Aggiunto «Salta al contenuto», con focus giallo perché il fondo è
   nero. Poiché lo smooth-scroll intercetta i link `#`, ora sposta anche il focus: `main` ha
   `tabindex="-1"` apposta, senza contorno perché non è un controllo.
4. **La figura verticale su mobile era impaginata male dal contenitore, non dall'asset.** A una
   colonna, `width: 100%` la portava a ~483px di altezza, il `max-height: 220px` la ricomprimeva e
   `object-fit: contain` lasciava due bande vuote ai lati. Non è stato ritagliato niente: è il
   contenitore ad adattarsi alla figura (`width: auto`, altezza massima 260px). Rapporto misurato
   dopo la correzione: 0,692 contro 0,693 nativo.
5. **Link verde su fondo d'errore rosato a 4,31** (sotto 4,5) nel nuovo blocco dell'area membro.
   Dentro `.form-error` i link sono ora neri e sottolineati.
6. **Spazi mangiati prima dei link.** Quattro punti (footer, tesseramento, due nell'informativa)
   in cui il testo si attaccava al link. Corretti; la build è stata ripassata con una scansione
   automatica dell'HTML prodotto: 0 occorrenze residue.
7. **Didascalia bianca sopra una foto.** Il contrasto sopra un'immagine non è calcolabile in
   automatico. La sfumatura ora arriva ad almeno 0,78 di nero su tutta la fascia della didascalia:
   il bianco resta sopra 10:1 anche sul punto più chiaro possibile dell'immagine.

### Controlli eseguiti

| Controllo | Come | Esito |
|---|---|---|
| `npm run check:all` | astro check + tsc functions | 0 errori, 0 warning, 0 hint |
| `npm run build` | build statica | 4 pagine |
| Sezioni e àncore presenti | probe DOM su `dist` servito da `wrangler pages dev` | 11 sezioni, 4 àncore storiche |
| Nessun pulsante d'acquisto | enumerazione DOM in `#membership` e `#merch` | solo un'àncora interna |
| Contrasto automatico, home | 153 nodi di testo esaminati | 2 segnalazioni, **entrambi falsi positivi** (didascalia bianca sopra la foto: lo script legge solo `background-color` e non vede né l'immagine né la sfumatura `::after`) |
| Contrasto automatico, `/privacy` | 64 nodi | 0 |
| Contrasto automatico, `/account` nei tre stati | 19 / 20 / 30 nodi | 1 problema trovato **e corretto** (punto 5), poi 0 |
| Tastiera: ordine e visibilità del focus | 14 `Tab` reali, eventi `focusin` registrati | 13 elementi, tutti con contorno visibile, ordine coerente |
| Salto al contenuto | focus da tastiera + screenshot | compare in alto a sinistra, contorno giallo su nero |
| Reflow senza scorrimento orizzontale | viewport 640×512 (≈1280 al 200%) e 330×700 | nessuno scorrimento orizzontale del documento |
| Schwa nella catena reale | `document.fonts` + misure canvas + prova visiva | il sottoinsieme `latin-ext` di Inter (che contiene U+0259) risulta **caricato**: la ə è disegnata da Inter, non dal fallback. Forzando `sans-serif` e `serif` di sistema resta disegnata correttamente |
| Illustrazione: proporzioni | misura del box renderizzato | desktop 220×317,7 e mobile 180×260, rapporto 0,692 contro 0,693 nativo |

Il risultato sul contrasto va letto per quello che è: **zero problemi rilevati dal controllo
automatico di contrasto** su home, `/privacy` e `/account` nei tre stati, dopo la correzione del
punto 5. Non è un giudizio complessivo di accessibilità.

### Screenshot acquisiti

Desktop (1280 e 800 CSS px) e mobile (375×812), dopo il caricamento di immagini e font e dopo la
conclusione dell'intro: hero, sezione illustrata `#lavoro`, banner assemblea, `#cosa-costruiamo`,
`#membership`, `#merch`, footer, `/account` nello stato «sessione assente» e nello stato d'errore.

Nota di metodo: la cattura della pagina *scorsa* restituiva immagini bianche. La causa non era il
sito ma il modo di catturare. Le sezioni sono state quindi portate in cima alla viewport spostando
il `margin-top` del `body` a scorrimento zero, e catturate lì. Gli screenshot bianchi non sono
stati contati come verifica.

### Controlli non eseguiti — restano aperti

1. **`prefers-reduced-motion` in un browser reale.** La regola CSS e la guardia JS sono verificate
   nell'output di build (`@media (prefers-reduced-motion: reduce){.cogu-intro-overlay{display:none!important}}`
   e l'uscita anticipata dello script inline), ma la preferenza di sistema non è emulabile con gli
   strumenti disponibili qui. Va provata attivandola nel sistema operativo.
2. **Stati `:hover` a colori misurati.** Le regole sono in sorgente, i valori erano già stati
   calcolati in Fase 3 e `:hover` risulta correttamente attivo sull'elemento puntato; però la
   rilettura dei colori calcolati attraverso l'automazione restituisce sempre lo stato base, quindi
   non è stata usata come prova. Da guardare a occhio.
3. **Screen reader.** Non eseguibile da qui.
4. **Area membro con una sessione reale.** Gli stati «sessione assente» ed «errore» sono stati
   visti; lo stato «tessera caricata» è stato controllato solo per il contrasto, mostrando il
   blocco con i valori segnaposto. Serve un accesso vero, quindi Supabase configurato.
5. **Font Awesome e Google Fonts da CDN.** In locale l'icona della busta non si carica. In
   produzione arriverebbe, ma resta aperta la valutazione del piano §4 sull'auto-ospitare entrambi
   per ridurre le terze parti contattate.
6. **Rendering dello schwa su un secondo sistema operativo.** Qui è verificato su Windows.
7. **«Sei aziende, e un acronimo»** resta un titolo provvisorio: da pubblicare solo se il contenuto
   MANGOS è verificato e utile.

### Rimandato alla Fase 5 — perimetro della fase successiva, non problema aperto

- `src/pages/auth/callback.astro` avvia ancora un checkout se riceve `?tier=...`. Nessun elemento
  del sito produce più quel parametro, ma il percorso va chiuso lato server insieme al resto del
  gating.

---

## Fase 5 — Pagamenti fermi, dipendenze tolte, consegna

Data: 2026-09-05. Ramo: `dev`. Nessun push, nessun merge, nessun deploy, nessuna modifica DNS,
nessuna attivazione Stripe.

### 1. I tre checkout sono bloccati lato server

Nuovo modulo `src/lib/pagamenti.ts`. Il blocco è la **prima istruzione** di ciascuno dei tre
endpoint (`functions/api/checkout.ts`, `checkout-merch.ts`, `checkout-sostenitore.ts`): viene prima
della lettura del corpo, prima della validazione del token — che è già una chiamata di rete verso
Supabase — prima della costruzione del client Stripe e prima di qualunque scrittura.

Due condizioni, non una:

- `PAGAMENTI_ATTIVI` deve valere **esattamente** `"true"`. Assente, vuota, `"false"`, `"1"`, `"si"`,
  `"TRUE"`, `" true "`: tutto il resto tiene chiuso. Una variabile scritta male deve chiudere, non
  aprire.
- Con la bandiera accesa ma anche una sola variabile mancante o vuota, si risponde comunque con un
  errore controllato. Senza, si sarebbe costruito il client Stripe con una chiave `undefined` e si
  sarebbe fallito dentro la libreria, con un 500 opaco.

In entrambi i casi: `503`, JSON `{ error, pagamenti }`, `cache-control: no-store`. Il messaggio
pubblico **non** dice quali variabili mancano: quel dettaglio va nei log del runtime.

Il **webhook Stripe non passa dal cancello**, di proposito: deve poter riconciliare eventuali
pagamenti già avviati anche a incassi chiusi.

### 2. Il callback non avvia più un checkout

`/auth/callback?tier=cognitario` faceva partire una sessione di pagamento anche senza nessun
pulsante nel sito. Ora il ramo è dietro `PUBLIC_PAGAMENTI_ATTIVI`, e il percorso resta lì intatto
per la riattivazione. È comodità, non sicurezza: il confine vero è lato server, che rifiuta
comunque.

### 3. Font e icone non passano più da terzi

Erano due `<link>` verso `fonts.googleapis.com` e `cdnjs.cloudflare.com`: due terze parti
contattate a ogni visita, due punti di rottura (in Fase 4 l'icona della busta non arrivava) e due
voci nell'audit cookie.

- **Font in `public/fonts/`**, `@font-face` in `src/styles/font.css`. Inter e Shantell Sans, SIL
  OFL 1.1, con `Inter-OFL.txt` e `ShantellSans-OFL.txt` versionati accanto ai file come la licenza
  richiede, più un `LEGGIMI.txt` che spiega cosa c'è e perché.
- **Icone**: `src/components/Icona.astro`, sei forme geometriche disegnate qui. Nessun foglio di
  stile esterno, nessuna questione di licenza, e scalano bene allo zoom.
- **anime.js** non arriva più da jsdelivr: è una dipendenza del progetto, caricata con un import
  dinamico (chunk separato di 39 KB, solo sulla home, mai con movimento ridotto).

I due file `-ext-sub` sono sottoinsiemi ridotti ai segni latini estesi che servono davvero, schwa
compresa: per Inter 28 KB invece di 133. Il rischio del sottoinsieme — un carattere nuovo che
torna in silenzio al font di sistema — è coperto da un controllo automatico (punto 8).

### 4. Il font delle annotazioni: Shantell Sans

Tre candidati provati sulle stesse frasi in `_local/campionario/confronto-font.html`, con misura
automatica della schwa oltre alla prova visiva:

| Font | ə nel font | ə nel controllo monospace | Esito |
|---|---|---|---|
| Shantell Sans | 36,22 px | 35,19 px | disegnata dal font |
| **Kalam** | **35,19 px** | **35,19 px** | **identica al controllo: il glifo non c'è** |
| Caveat | 20,80 px | 35,19 px | disegnata dal font |
| Inter (confronto) | 34,31 px | 35,19 px | disegnata dal font |

**Kalam non contiene U+0259.** Il sottoinsieme `latin-ext` di Google copre l'intervallo che la
comprende, ma l'intervallo non è il glifo: con Kalam, «Studentə» e «Cognitariə» sarebbero uscite
con una lettera presa da un altro carattere. Verificato anche a occhio: nella riga di Kalam la ə è
visibilmente dritta, mentre il resto è inclinato.

Shantell Sans entra in un punto solo: `.nota-metodo`, il commento a margine. Peso medio (500),
nessuna animazione. Inter resta per tutto il resto.

### 5. Privacy e testi pubblici

`/privacy` conteneva la bozza dell'informativa lunga: dati legali fra parentesi quadre, una nota in
pagina che diceva «non pubblicare così com'è», e la descrizione di trattamenti che oggi non
avvengono. Non era completabile da qui — servono i dati legali dell'ente, la verifica sull'art. 9,
la retention matrix e l'audit terze parti.

La pagina ora dice quello che è vero adesso: il sito non raccoglie dati, non ci sono moduli, le
iscrizioni sono chiuse; cosa viene contattato aprendo una pagina (solo YouTube, e solo arrivando
alla sezione video); cosa succede se ci si scrive; e l'impegno esplicito a pubblicare l'informativa
estesa **prima** di raccogliere il primo dato. Il testo lungo è in
`docs/informativa-privacy-bozza.md` con l'elenco di cosa serve per completarlo.

`PRIVACY_POLICY_VERSION` passa a `v2-2026-09-05`. **Bloccante prima di riaprire**: la migration
0005 registra ancora `v1-2026-08-20` come versione accettata. Oggi è inerte (nessuno può accettare
niente), ma va allineata con una nuova migration.

**MANGOS è stato tolto.** La sezione «Perché ci preoccupa» reggeva interamente sull'acronimo: una
etichetta di mercato riciclata, con dentro tre società non quotate, spiegata per essere subito
smontata. Aggiungeva rumore. Il punto che valeva — le decisioni si prendono altrove,
l'infrastruttura atterra qui — è passato in coda a «La corsa e dove atterra», dove ci sono i dati
Terna che lo sostengono.

### 6. Intro: quattro casi, tutti provati

Provati con un server locale che rompe apposta il caricamento del chunk
(`scratchpad/serve-prove-intro.js`, non versionato).

| Caso | Come | Risultato |
|---|---|---|
| Normale | chunk servito subito | intro completa, overlay rimosso, hero visibile |
| Lento | chunk ritardato di 6 s | a 3 s il failsafe scopre la pagina; a 6 s il modulo **rinuncia** |
| Fallito | chunk servito con 503 | il `catch` scopre la pagina, nessun testo invisibile |
| Movimento ridotto | `matchMedia` forzato | nessun gate CSS, nessun overlay, **chunk mai scaricato** |

**Difetto trovato e corretto qui**: nel caso lento, il modulo arrivava dopo il failsafe e faceva
ripartire l'intro da capo, calando il pannello nero su una pagina che si stava già leggendo. Ora
`window.__coguReveal` lascia una traccia (`__coguRivelato`) e il modulo si ferma prima di creare
l'overlay.

Nota sul caso «movimento ridotto»: la preferenza di sistema non è emulabile con gli strumenti
disponibili, quindi il ramo JavaScript è stato provato con `matchMedia` sostituito, e la metà CSS
(`@media (prefers-reduced-motion: reduce){.cogu-intro-overlay{display:none!important}}`) è
verificata nel foglio di stile costruito. Non è la stessa cosa di una prova con la preferenza
attiva nel sistema operativo: resta da fare così.

### 7. Verifica visiva senza toccare gli stili

Metodo: **solo emulazione del viewport**, nessuno spostamento di margini o posizionamenti. Il
riquadro del browser in questa sessione cattura solo a scorrimento zero, quindi le pagine sono
state guardate con viewport alti (800×1000, 800×4000, 800×9999) che mostrano il documento dall'alto
senza scorrere, e mobile a 390×2000.

Guardati: home completa (800×9999, tutte le sezioni presenti, tre iframe video caricati,
illustrazione caricata), i primi 4000 px a piena leggibilità, `/privacy`, `/account`, home mobile,
stati hover, zoom.

**Limite dichiarato**: a scorrimento diverso da zero la cattura torna bianca, e le catture dopo
navigazione a un'ancora funzionano solo la prima volta. Le sezioni in fondo alla home (tesseramento,
merch, footer) sono quindi verificate in leggibilità piena solo per `#membership` (una cattura
riuscita), e per il resto nella panoramica a pagina intera più i controlli su DOM e testo. Non è
stato usato nessun trucco sugli stili per aggirare il limite.

### 8. Controlli automatici nuovi

- `npm run check:glifi` — legge gli `unicode-range` da `src/styles/font.css` e li confronta con i
  caratteri presenti nell'HTML costruito. Provato iniettando `→` e `中`: fallisce come deve.
- `npm run check:testi` — cerca segnaposto di bozza (parentesi quadre con testo, TODO, «da
  completare») e testo attaccato a un link o a un `<strong>`. Quest'ultimo problema è comparso
  **sette volte** in due fasi, sempre per lo stesso motivo: Astro toglie lo spazio prima di un a
  capo. Ora lo prende il controllo, non l'occhio.
- `npm run test:functions` — 15 prove sul cancello dei pagamenti, incluse le tre chiamate agli
  endpoint veri con `fetch` sostituita da una funzione che fallisce: se il blocco lasciasse passare
  anche solo la validazione del token, il test fallirebbe.
- `npm run verify` esegue tutto in fila. La CI (`.github/workflows/ci.yml`) fa lo stesso e ora
  gira anche sui push a `dev`.

### 9. Controlli eseguiti

| Controllo | Esito |
|---|---|
| `npm run check:all` | 0 errori, 0 warning, 0 hint |
| `npm run build` | 4 pagine |
| `npm run check:glifi` | nessun carattere fuori dai font ospitati |
| `npm run check:testi` | nessun segnaposto, nessuno spazio mangiato |
| `npm run test:functions` | 15 test, 15 passati |
| Tre checkout via `wrangler pages dev` con `.dev.vars` reale (bandiera assente) | 503 `non_attivi` su tutti e tre |
| Tre checkout con bandiera `true` e chiavi Stripe svuotate | 503 `configurazione_incompleta` su tutti e tre |
| Intro nei quattro casi | vedi tabella al punto 6 |
| Hover pulsante primario e voci di menu | verificato **a vista**: rosa più chiaro con testo nero, voce di menu verde e sottolineata |
| Zoom 200% | viewport dimezzato (640×1000) e `zoom: 2` del documento: nessuno scorrimento orizzontale, tutto in colonna, niente tagliato |
| Struttura per lettori di schermo | `lang="it"`, un solo `h1`, gerarchia coerente, 4 landmark, 0 link e 0 pulsanti senza nome accessibile, 0 SVG esposti, iframe con `title` |

Due correzioni nate da quest'ultimo controllo: il titolo del footer era un `h3` e finiva allo stesso
livello delle schede del merch (ora è un paragrafo con la stessa resa); l'alt di `runlocal.png` era
«run local ai», che a chi non vede l'immagine non dice niente.

### 10. Nota di metodo sulle misure

`getComputedStyle` letto attraverso l'automazione di questa sessione restituisce valori vecchi per
alcune proprietà (`opacity`, `background-color`, `transform`): il pulsante dell'hero risultava a
`opacity: 0` mentre negli screenshot era perfettamente visibile, e uno stato hover forzato con
`!important` continuava a leggersi con i valori di base. Le verifiche di stato sono quindi state
fatte **a vista**, non per rilettura di stili. Vale la pena saperlo per le prossime volte.

### 11. Controlli non eseguiti — restano aperti

1. **Area membro con una sessione reale.** Non c'è modo di crearne una: il modulo di iscrizione non
   esiste più e il magic link richiede una casella di posta. Sono stati visti gli stati «sessione
   assente» ed «errore»; lo stato «tessera caricata» no.
   **Requisito prima di aprire pubblicamente gli account**: provare l'accesso vero end-to-end
   (magic link → callback → area membro) con Supabase configurato.
2. **`prefers-reduced-motion` con la preferenza attiva nel sistema operativo** (punto 6).
3. **Lettore di schermo vero.** Fatta la verifica strutturale, non l'ascolto.
4. **Schwa su un secondo sistema operativo.** Qui verificata su Windows.
5. **Audit cookie e terze parti** per il momento dell'apertura: restano YouTube (nocookie) sulla
   home e, quando riapriranno le iscrizioni, Supabase Auth, Stripe e Turnstile.
6. **Allineamento della versione dell'informativa** con una nuova migration (punto 5).
7. **Dati legali dell'ente**, verifica sull'art. 9 e retention matrix: prerequisiti
   dell'informativa estesa, elencati in `docs/informativa-privacy-bozza.md`.

### 12. Come si riaccendono i pagamenti

1. Definire retention matrix, base giuridica e dati legali; pubblicare l'informativa estesa e
   allineare `PRIVACY_POLICY_VERSION` con una nuova migration.
2. Ricreare il modulo di iscrizione (`MembershipSignup`), rimosso in Fase 4, con Turnstile
   configurato in Supabase Auth.
3. Impostare le variabili Stripe nell'ambiente Cloudflare Pages e verificare che ci siano **tutte**
   (il cancello risponde `configurazione_incompleta` se ne manca una).
4. Mettere `PAGAMENTI_ATTIVI=true` lato server e `PUBLIC_PAGAMENTI_ATTIVI=true` lato build.
5. Rimettere i pulsanti in `Membership.astro` e `Merch.astro` e togliere le etichette «Non ancora
   aperto» / «Non ancora in vendita».
6. Ripristinare `hasOfferCatalog` nei dati strutturati di `BaseLayout.astro`.
7. Eseguire la checklist di verifica del piano: SEPA in test, idempotenza del webhook, eventi fuori
   ordine, cleanup degli utenti non confermati.

Per spegnere di nuovo basta il passo 4 al contrario: togliere `PAGAMENTI_ATTIVI` chiude i tre
endpoint senza toccare il codice.

---

## Preparazione della preview pubblica — 06/09/2026

Ramo `dev`. Obiettivo: mettere online una **preview** del sito senza pagamenti e senza
registrazioni. Nessun merge, nessun deploy production, nessuna modifica DNS.

### 1. Dove va a finire un push di `dev` — verificato prima di pushare

Wrangler non è autenticato in questa postazione, quindi il pannello Cloudflare non è
interrogabile direttamente. La configurazione è stata ricostruita dall'esterno, con dati
pubblici e in sola lettura:

| Cosa | Come è stato verificato | Risultato |
|---|---|---|
| Produzione vera del dominio | `GET /repos/gattcocco/cognitariat/pages` | GitHub Pages, `build_type: legacy`, sorgente **branch `main`**, dominio `cognitariatzone.org` |
| Deployment registrati su GitHub | `GET .../deployments` | solo `github-pages` su `main`: nessun deployment Cloudflare passa da qui |
| Cloudflare è collegato al repo? | check runs sull'head di `feat/membership-v2-1` | sì: app «Cloudflare Workers and Pages», progetto Pages `cognitariat` |
| Qual è il branch di produzione di Pages | confronto byte a byte fra `https://cognitariat.pages.dev/` (alias di produzione) e `https://8a7a5902.cognitariat.pages.dev/` (deployment costruito da `feat/membership-v2-1`) | **identici** (29 464 byte, stesso sha1): la produzione di Pages è servita da `feat/membership-v2-1` |
| Alias di branch | `main.` / `dev.` / `feat-membership-v2-1.cognitariat.pages.dev` | 404 tutti e tre: nessuna preview esistente per quei branch |

Conclusione: **`dev` non è il branch di produzione di nessuno dei due hosting.**
`cognitariatzone.org` si aggiorna solo da `main`; `cognitariat.pages.dev` solo da
`feat/membership-v2-1`. Un push di `dev` può al massimo produrre una preview, oppure non
produrre niente se le preview sono disattivate per i branch non di produzione — in nessun caso
tocca la produzione. Da qui il via libera al push.

Corrisponde a quanto documentato in `PROVISIONING.md` §4, che dava il production branch a
`feat/membership-v2-1` («temporaneo e voluto»). La verifica non si è fermata al documento
perché un documento dice le intenzioni, non lo stato.

### 2. Documenti di lavoro fuori dal repository

`.gitignore` esclude ora `/testi-sito.md` e `/info regole nuovi testi/`, che restano sul disco.
Controllato che restino **tracciati** i font open source con le loro licenze
(`public/fonts/*.woff2`, `Inter-OFL.txt`, `ShantellSans-OFL.txt`, `LEGGIMI.txt`), il copy
definitivo, il manuale di brand e i registri; e che restino **esclusi** gli originali
commerciali e i certificati personali (`font/DoodleLines.*`, `font/license_certificate_*.pdf`,
tutto `_local/`).

### 3. Supabase: il modulo tolto non chiude l'API

Il modulo di iscrizione è stato rimosso in Fase 4, ma `PUBLIC_SUPABASE_URL` e la anon key sono
pubbliche per costruzione: l'endpoint Auth risponde a chiunque le usi, modulo o non modulo.

**Non è stato possibile verificarlo qui**: `.dev.vars` e `.env` di questa copia contengono
segnaposto (`https://placeholder…`, `placeholder…`, `sk_test_placeholder`), non le credenziali
del progetto vero. Nessuna chiamata all'infrastruttura reale è quindi stata fatta.

Al suo posto è stato scritto `npm run check:supabase`
(`scripts/verifica-supabase.mjs`), da eseguire con le credenziali vere. Fa due cose, entrambe
senza effetti collaterali:

- legge `GET /auth/v1/settings` (pubblico, sola lettura) e riporta se le registrazioni via API
  sono aperte, se la conferma email è saltata, quali provider esterni sono attivi;
- manda **una** richiesta di magic link con un indirizzo volutamente non valido. Non parte
  nessuna email e non nasce nessun utente in nessuno dei due casi: conta solo quale errore
  torna. Errore di captcha ⇒ il captcha è preteso prima della validazione. Errore di formato ⇒
  nessun captcha, e una richiesta ben formata sarebbe passata.

Lo script **non modifica niente** e chiude ricordando di contare gli utenti confermati
esistenti prima di chiudere le registrazioni, per non togliere l'accesso a qualcuno senza
saperlo.

Segnalazione a parte: `.env` contiene `PUBLIC_TURNSTILE_SITE_KEY=1x00000000…`, che è la
**site key di prova** di Cloudflare — quella che passa sempre. Va sostituita con la chiave vera
quando il widget tornerà in pagina.

### 4. Il consenso privacy non si deduce dalla conferma email

Nuova migration `supabase/migrations/0007_consenso_privacy_esplicito.sql`, **non applicata** al
database remoto.

Il difetto stava nella 0005: a ogni transizione `email_confirmed_at NULL → non NULL` veniva
scritta una riga in `privacy_acceptances`, con una versione fissata nel codice della funzione.
Cioè: cliccare un magic link veniva registrato come prova di aver accettato l'informativa. Il
click prova che quella casella è tua; non prova che ti sia stato mostrato un testo, né quale.
Sbagliava in tre modi concreti: registrava accettazioni per utenti creati per altre vie (invito,
chiamata diretta all'API); stampava la versione corrente del server invece di quella vista dalla
persona; scattava anche su una riconferma o un cambio di indirizzo.

La 0007: tiene la creazione del profilo alla conferma (quella è corretta); scrive in
`privacy_acceptances` **solo** se i metadata dichiarano esplicitamente il consenso e la versione
vista; accetta solo versioni presenti nella nuova tabella `privacy_versions` (dove convivono
`v1-2026-08-20` e `v2-2026-09-05`, invece di sostituirsi); non tocca una riga esistente. In coda
c'è una query diagnostica commentata che elenca le accettazioni prive di dichiarazione — da
leggere, non da eseguire alla cieca.

**L'allineamento v1/v2 da solo non chiude il punto.** Perché esista una prova vera serve che il
modulo di iscrizione, quando verrà ricostruito, passi `privacy_version` e `privacy_accepted` in
`options.data` di `signInWithOtp()`, con una casella separata e non pre-spuntata. Senza quei
campi la 0007 non registra niente, ed è voluto: meglio nessuna prova che una prova finta.

### 5. Informativa: cosa dice adesso e cosa manca davvero

Aggiunte le tre cose fattuali che mancavano e che si potevano scrivere senza inventare:

- **l'hosting**: quali dati tecnici registra Cloudflare (IP, momento, pagina, browser) e a cosa
  servono — prima si diceva solo che «registra i dati tecnici»;
- **YouTube**: che la richiesta arriva a Google, sui suoi server, anche fuori dall'Unione
  Europea, e che finché non si scorre fino ai video non parte niente;
- **la posta**: che la casella è su Proton (Proton AG, Svizzera). Era l'unico punto in cui dei
  dati arrivano davvero a noi, e il fornitore non era nominato.

Non sono state scritte garanzie sui fornitori, tempi di conservazione o basi giuridiche: non
sono verificati e inventarli sarebbe peggio che ometterli. **Manca ancora** (elenco preciso, per
il lancio pubblico e a maggior ragione per la riapertura delle iscrizioni):

1. **Titolare del trattamento**: denominazione legale, sede, codice fiscale ed eventuale partita
   IVA, PEC se presente. Oggi la pagina non dice chi risponde dei dati — è il buco principale.
2. **Referente privacy / DPO**, se nominato.
3. **Tempi di conservazione** dei log di hosting e delle email ricevute.
4. **Basi giuridiche** dichiarate per i due trattamenti che esistono già (log tecnici e
   corrispondenza).
5. **Rapporti con i fornitori**: se e con quali garanzie sono inquadrati Cloudflare, Proton e
   Google (per gli embed).
6. Per la riapertura: art. 9, retention matrix, audit cookie completo — già elencati in
   `docs/informativa-privacy-bozza.md`.

### 6. «Perché ci preoccupa» torna, senza MANGOS

Riscritta da zero su due decisioni già prese e un dato già misurato, entrambi dalla tabella
delle fonti verificate di `docs/copy-home-v2.md`:

- **Irlanda, CSO, dati 2024**: i data center consumano il 22% dell'elettricità contatorizzata,
  contro il 5% del 2015. Un consuntivo, non una proiezione;
- **ddl 1821**, Camera 24/02/2026, 243 sì / 0 no / 6 astenuti: qualifica i data center come
  opere di pubblica utilità e delega il Governo a semplificarne le procedure in sei mesi.

Il legame con il lavoro è dichiarato per quello che è — una lettura nostra, non un dato: quando
qualcosa viene dichiarato necessario, discuterne le condizioni diventa un intralcio; vale per un
terreno e per un contratto. La sezione chiude sull'identità doppia, documentare e spiegare.

Il dettaglio parlamentare del ddl si è spostato qui; in «Quello che c'è davvero» resta la voce
sull'attività (leggiamo i testi di legge) senza ripetere gli stessi numeri. La sezione è più
corta delle alternative, di proposito.

### 7. Pagamenti: nessuna riattivazione automatica

- La bandiera `PAGAMENTI_ATTIVI` non è impostata da nessuna parte nel repository: i due file di
  esempio la mettono a `false`, la CI non la tocca, `wrangler.toml` non la contiene.
- Nessun punto del codice legge lo stato dell'account Stripe: inserire un IBAN nel pannello
  Stripe non cambia niente qui. L'unico interruttore è la variabile d'ambiente.
- Lato browser il controllo è **al momento della build**, non a runtime: nel bundle prodotto il
  ramo del checkout nel callback **non esiste proprio**, il compilatore l'ha eliminato. Il
  callback compilato si riduce a leggere `tier` e andare all'area membro. Riaccenderlo richiede
  una nuova build, non basta cambiare una variabile: è una proprietà utile, niente si accende da
  solo.

### 8. Pagina 404

Non esisteva. Senza, Cloudflare Pages e GitHub Pages servono la loro pagina di errore generica,
senza intestazione e senza un modo di tornare indietro — e chi arriva da un link vecchio pensa
che il sito non ci sia più. Aggiunta `src/pages/404.astro`, che i due hosting usano da soli
perché Astro la costruisce come `dist/404.html`. Dice che il sito è stato riscritto e dove
guardare.

### 9. Controlli eseguiti

| Controllo | Esito |
|---|---|
| `npm run verify` | 0 errori, 0 warning, 0 hint · build 6 pagine · glifi ok · testi ok · 15/15 test |
| Smoke test `/` | 200 |
| Smoke test `/privacy`, `/account`, `/auth/callback` | 200 (dopo il redirect di trailing slash) |
| Smoke test percorso inesistente | **404** con la nostra pagina |
| `/account` da disconnessi | stato «sessione assente», zero richieste esterne |
| POST ai tre checkout | **503** `non_attivi` su tutti e tre |
| Sezione ripristinata | verificata a vista: occhiello «Contesto», due fatti, fonti in coda, più corta delle alternative |

Il controllo `check:testi` ha intercettato due spazi mangiati nei testi nuovi (Irlanda e 404)
prima che finissero nella build: è esattamente il motivo per cui esiste.

### 10. Cosa resta aperto per il sito pubblico

1. **Titolare del trattamento e dati legali dell'ente** — senza, l'informativa non è completa.
2. **Configurazione Supabase da verificare con le credenziali vere** (`npm run check:supabase`):
   registrazioni via API e captcha davanti all'endpoint Auth.
3. **Site key Turnstile di prova** in `.env`, da sostituire con quella vera.
4. **Migration 0007 da applicare a mano** quando si riaprono le registrazioni, insieme al
   modulo di iscrizione che porti la dichiarazione di consenso.
5. **Area membro con una sessione reale**: mai provata end-to-end.
6. `prefers-reduced-motion` con la preferenza attiva nel sistema operativo; lettore di schermo;
   schwa su un secondo sistema operativo.
7. **`/admin`** (Sveltia CMS) è servito dal sito, `noindex` e non linkato, ma raggiungibile:
   punta al backend GitHub sul branch `main` e carica lo script da `unpkg.com`. Da confermare
   che l'accesso OAuth non sia configurato — o da proteggere — prima del lancio pubblico.

---

## Blog, CMS e primo articolo — 06/09/2026

Ramo `dev`, quattro checkpoint in sequenza sullo stesso checkout. Nessun merge, nessun deploy
production, nessuna modifica DNS.

### A — Baseline

`npm run verify` verde prima di toccare qualsiasi cosa: 0 errori, 0 warning, 0 hint, build,
glifi, testi, 15/15 test. Working tree pulito, `dev` allineato con l'origine.

Niente è stato rifatto: migrazioni, blocco dei pagamenti, font, icone, informativa e sezione
«Perché ci preoccupa» erano già a posto dal giro precedente.

**Cosa restava aperto, per area:**

*Sito pubblico* — titolare del trattamento e dati legali dell'ente (l'informativa non è
completa senza); `prefers-reduced-motion` con la preferenza attiva nel sistema operativo;
lettore di schermo; schwa su un secondo sistema operativo; verifica del ramo di produzione
Cloudflare **dalla configurazione** e non per confronto fra pagine.

*Account membri* — configurazione Supabase da verificare con le credenziali vere
(`npm run check:supabase`); site key Turnstile ancora quella di prova (`1x00000000…`);
migration 0007 da applicare a mano alla riapertura; modulo di iscrizione da ricostruire con la
dichiarazione di consenso; area membro mai provata con una sessione reale.

*Pagamenti* — niente di rotto: i tre checkout rispondono 503 anche sulla preview pubblica. Alla
riapertura restano da fare le variabili Stripe nell'ambiente, il ripristino dei pulsanti e di
`hasOfferCatalog`, e la checklist di verifica del piano (SEPA, idempotenza del webhook, eventi
fuori ordine, cleanup degli utenti non confermati).

**Sul ramo di produzione**: la verifica per confronto di pagine non è una verifica della
configurazione, ed è giusto non trattarla come tale. Quello che si sa adesso è di più di prima,
perché il push di ieri è un esperimento vero: `dev` ha prodotto una preview su
`dev.cognitariat.pages.dev` e la produzione (`cognitariat.pages.dev`, sha1 `dff6a90faf3c`) non è
cambiata di un byte, né prima né dopo i due push di oggi. Resta che il valore impostato nel
pannello nessuno l'ha letto: wrangler qui non è autenticato. Si chiude con
`npx wrangler login` e `npx wrangler pages project list`, oppure guardando *Settings → Builds &
deployments* del progetto `cognitariat`.

### B — Modello dei contenuti, /blog, pagine articolo, richiamo in home

Collection Astro `articles` con schema in `src/content.config.ts`, allineato campo per campo a
`/admin/config.yml`: sono le due facce dello stesso contratto.

Due scelte dello schema meritano di essere ricordate.

**La data si legge a mano.** `z.coerce.date()` interpreta `2026-09-06` come mezzanotte UTC, e
stampata con il fuso italiano quella data torna indietro di un giorno: il 6 settembre sarebbe
comparso come 5. La stringa viene spezzata e ricomposta come data locale a mezzogiorno, così
nessun fuso la sposta. Verificato sulla preview: «6 settembre 2026» in elenco, in home e in
pagina.

**La copertina obbliga a un testo alternativo.** Un campo facoltativo per l'accessibilità è un
campo che si dimentica: qui, se c'è `cover` e manca `coverAlt`, la build fallisce.

Il campo `bozza` non duplica l'editorial workflow del CMS: quello governa la revisione su Git,
questo la visibilità sul sito costruito. Comportamento verificato in entrambi i versi:

| | build normale | build con `MOSTRA_BOZZE=true` |
|---|---|---|
| pagina dell'articolo | **non generata** (404) | generata, con `noindex` |
| elenco `/blog` | assente | presente, con etichetta «Bozza» |
| richiamo in home | assente | **assente comunque** |
| sitemap | assente | **assente comunque** |

La home non mostra bozze nemmeno in locale: l'elenco serve anche a rivedere un pezzo, la vetrina
no. E la pagina non viene proprio costruita, perché togliere il link non basta — un indirizzo
indovinato o condiviso resterebbe raggiungibile.

La sitemap è scritta a mano invece che col plugin proprio per questo: parte dagli articoli
pubblicati, quindi le bozze non ci sono per costruzione e non per configurazione.

**Anteprime non indicizzate**: se Cloudflare passa un `CF_PAGES_BRANCH` diverso da
`BRANCH_PRODUZIONE` (predefinito `main`), le pagine escono con `noindex, nofollow`. Verificato
sulla preview. Al cutover la variabile va impostata: oggi il progetto Pages ha come produzione
`feat/membership-v2-1`, non `main`.

Corretti strada facendo due difetti preesistenti: le voci di menu erano ancore relative
(`#lavoro`), quindi da `/privacy` e `/account` metà del menu non faceva niente; e il layout non
aveva metadati per pagina, così l'anteprima social di qualunque indirizzo mostrava il testo
della home.

### C — CMS

Il CMS resta acceso e diventa usabile. Sveltia con backend GitHub ha bisogno di un servizio che
completi lo scambio OAuth, perché il client secret non può stare nel browser: invece di un
servizio di terzi, i due passaggi sono due Pages Function (`functions/api/cms-auth.ts` e
`cms-callback.ts`).

Verificato:

| Controllo | Esito |
|---|---|
| `/admin/` carica e legge la nostra configurazione | sì: riconosce il repository `cognitariat` e offre «Sign In with GitHub» |
| `/admin/config.yml` generata al build | sì, con `branch: dev` e `auth_endpoint: api/cms-auth` |
| `/api/cms-auth` senza configurazione OAuth | 503 con pagina che spiega, non un errore grezzo |
| `/api/cms-auth` con configurazione | 302 a `github.com/login/oauth/authorize`, `scope=repo`, `state` in cookie `HttpOnly; Secure; SameSite=Lax` |
| callback con `state` non corrispondente | rifiutato: `authorization:github:error` |
| callback senza codice | rifiutato allo stesso modo |
| il client secret compare nel sito costruito? | **no**, cercato in tutto `dist/` |
| token nei log | no: si registra il tipo di errore, mai il corpo della risposta di GitHub |
| `postMessage` del token | indirizzato alla nostra origine, non a `*` |

**Il branch passa da `main` a `dev`.** `main` serve il sito pubblico via GitHub Pages: il CMS non
deve poterlo toccare. Da qui un articolo arriva alla preview; portarlo altrove resta un passaggio
manuale e separato.

**La versione di Sveltia è fissata** (`@sveltia/cms@0.206.1`). Era senza numero, cioè sempre
l'ultima pubblicata: il programma che maneggia un token con permesso di scrittura sul repository
poteva cambiare da solo, senza che nessuno lo decidesse.

**Cosa non è stato verificato, e perché.** Il login vero e il salvataggio di un contenuto
richiedono o un'applicazione OAuth su GitHub — che solo chi amministra l'organizzazione può
creare — o un token personale, che non va chiesto né maneggiato da qui. La procedura è in
`docs/redazione-cms.md` §4; finché non è fatta, la redazione può entrare con «Sign In Using
Access Token», che è il meccanismo previsto da Sveltia e tiene il token nel browser di chi lo ha
creato.

L'accesso al CMS non ha niente in comune con gli account membri: qui ci si autentica su GitHub
per scrivere nel repository, non si è iscritti e non si tocca Supabase.

### D — Primo articolo

«Manifesto Cognitario contro l'Oligarchia AI», firma Editoriale, 6 settembre 2026, slug
`manifesto-cognitario-contro-oligarchia-ai`. Importato dal `.docx` **parola per parola**: sviste
e formulazioni discutibili sono rimaste dov'erano, perché correggerle di nascosto avrebbe
significato cambiare un testo firmato senza dirlo.

Le verifiche editoriali stanno in `docs/manifesto-verifiche-editoriali.md`. In sintesi, tre punti
da chiudere prima di qualunque pubblicazione sul sito pubblico: il nome sbagliato di Dario
Amodei; «Costituito legalmente», che contraddice il «in costruzione» del resto del sito e il
fatto che i dati legali per l'informativa non ci sono; e la chiamata all'iscrizione mentre il
tesseramento è chiuso. Segnalati, senza toccarli, anche l'attribuzione senza citazione a due
persone reali, la sovrapposizione fra «cabala», «grandi famiglie» e «strabiliardari», SpaceX
elencata fra le aziende di AI, cinque modi diversi di scrivere le desinenze e cinque refusi.

Scritti ex novo perché il modello li richiede e nel documento non c'erano: sommario e testo
alternativo della copertina. Sono segnalati come tali.

La copertina passa da 3,3 MB a 225 KB (WebP 1200 px) senza differenze visibili, con un JPEG di
pari nome per le anteprime social, che non ovunque gestiscono il WebP. L'originale resta fuori
dal repository.

Pubblicato **sulla sola preview**. Verificato lì: compare in `/blog`, compare in home, entra
nella sitemap, ha `og:type=article`, `og:image` e `article:published_time=2026-09-06`, e la data
si legge «6 settembre 2026» senza slittamenti.

### Controlli della pipeline

`npm run verify` eseguito dopo ogni checkpoint, sempre verde. Due regressioni intercettate dai
controlli e corrette prima del commit:

- `check:glifi` ha fermato la freccia `←` (U+2190) nel link «Tutti gli articoli»: non è nei
  sottoinsiemi dei font che ospitiamo e sarebbe stata disegnata dal font di sistema. Sostituita
  con la chevron SVG che già usiamo altrove;
- uno spazio mangiato nella nota sulle bozze in `/blog`, dallo stesso meccanismo di sempre.

Smoke test sulla preview pubblica: `/`, `/blog/`, la pagina dell'articolo, `/sitemap.xml`,
`/admin/`, `/admin/config.yml` tutte 200; un indirizzo inesistente 404 con la nostra pagina; i
tre checkout 503. Produzione invariata: `cognitariat.pages.dev` e `cognitariatzone.org` hanno lo
stesso sha1 di prima dei push.

### Resta aperto

Oltre a quanto elencato nel checkpoint A:

1. **Configurazione OAuth del CMS** (`docs/redazione-cms.md` §4): applicazione GitHub e tre
   variabili su Cloudflare, fra cui `CMS_AUTH_BASE_URL` puntata all'alias di ramo. Senza, il
   login GitHub non parte e resta il token personale.
2. **`BRANCH_PRODUZIONE`** da impostare al cutover, altrimenti il sito vero uscirebbe con
   `noindex` — il valore predefinito `main` non è il ramo di produzione attuale del progetto
   Pages.
3. **Punti editoriali del manifesto**: i tre della sezione 1 di
   `docs/manifesto-verifiche-editoriali.md`.
4. **Verifica del ramo di produzione dal pannello**, non per confronto di pagine.

---

## Verso il primo rilascio — 07/09/2026

Ramo `dev`. Perimetro: nuova grafica, nuovi testi, blog roll in home, blog, CMS utilizzabile.
Pagamenti e registrazioni membri restano spenti, la struttura Stripe intatta. Nessun merge in
produzione, nessuna modifica DNS.

### Fase 1 — Documenti dell'associazione

Letti in sola lettura atto costitutivo registrato, statuto e verbale di nomina. Le scansioni non
avevano uno strato di testo e sulla macchina non c'era né OCR né Ghostscript: le pagine sono state
estratte come immagini con una libreria temporanea installata fuori dal repository, lette, e le
copie cancellate subito dopo. Nel repository non è entrato nessun documento firmato, nessun nome
di socio fondatore e nessun dato personale del legale rappresentante.

Quello che è documentato e quello che manca sta in `docs/dati-associazione.md`. In sintesi:
l'associazione esiste dal **12 luglio 2026** come **associazione sindacale non riconosciuta** ex
artt. 36 ss. c.c. e art. 39 Cost., senza fini di lucro, atto registrato all'Agenzia delle Entrate,
codice fiscale **98031460151**, durata indeterminata.

**Un punto ritirato, ed era mio.** Avevo segnalato «Costituito legalmente» nel manifesto come in
contraddizione con il sito. Non lo è: un'associazione costituita che non ha ancora aperto il
tesseramento online non è un paradosso, sono due cose diverse. A essere impreciso era il sito, che
diceva «sindacato in costruzione» in un modo leggibile come «non ancora esistente». Corretto in
hero, footer e dati strutturati, dove ora compare anche `foundingDate`.

**La sede resta in sospeso, e non è stata scelta.** L'atto (12/07) dice Via Papa Giovanni XXIII,
Bresso; il verbale (03/09) dice Via Togliatti 57, Assago. Un verbale di nomina non è l'atto con
cui si sposta una sede legale: se il trasferimento c'è stato serve la delibera, se non c'è stato
la sede è quella dell'atto. Finché non arriva conferma, sul sito non compare nessun indirizzo e
`/privacy` lo dice apertamente.

Da sapere prima di scegliere: **l'indirizzo di Assago coincide con la residenza del legale
rappresentante**. Pubblicare quella sede significa pubblicare l'abitazione di una persona, su un
sito che si occupa di conflitto. Non è un ostacolo giuridico — la sede legale è un dato pubblico —
ma è una scelta da fare sapendolo.

`/privacy` indica ora il titolare del trattamento: denominazione, forma giuridica, data di
costituzione, codice fiscale. Era il buco principale ed è chiuso a metà: manca la sede, e mancano
tempi di conservazione, basi giuridiche e rapporti con i fornitori, che sono decisioni da prendere
più che dati da trovare.

Sulla base giuridica dell'art. 9 GDPR la documentazione ora dice qualcosa di preciso: ente con
finalità sindacali statutarie ex art. 39 Cost., cioè la fattispecie che l'art. 9.2.d contempla.
Resta una valutazione di chi segue la compliance, ma non è più un'ipotesi campata in aria.

### Fase 2 — CMS

| Verifica | Esito |
|---|---|
| Percorso completo simulando il commit del CMS: bozza con copertina e alt → build pubblica | invisibile ovunque: nessuna pagina, fuori da elenco, home e sitemap |
| Stessa bozza, build locale con `MOSTRA_BOZZE=true` | visibile solo lì, con `noindex`, comunque fuori da home e sitemap |
| Stessa bozza, build con `CF_PAGES_BRANCH` impostata | **ignorata**: su un ambiente ospitato la variabile da sola non basta |
| Spunta «Bozza» tolta | pagina costruita, alt in pagina, JPEG per i social, data senza slittamenti, elenco, home, sitemap, indicizzabile |
| Totale | **18 controlli su 18** |

**Permesso ridotto.** Lo scope OAuth passa da `repo` a `public_repo`, dopo aver verificato che il
repository è pubblico. È la differenza fra «può scrivere nei repository pubblici» e «può leggere e
scrivere in tutti i repository, anche privati, di chi fa il login».

**MOSTRA_BOZZE limitata all'ambiente locale.** Una preview su Cloudflare ha un indirizzo pubblico:
non chiede credenziali e chiunque ce l'abbia può aprirla. Il `noindex` tiene fuori i motori di
ricerca, non le persone. Su Cloudflare le bozze non si costruiscono, a meno che non si dichiari
con `BOZZE_AMBIENTE_PROTETTO=true` che davanti c'è un vero controllo d'accesso. Se la variabile è
impostata comunque, la build lo scrive nei log invece di ignorarla in silenzio.

**Il ramo del CMS è una variabile** (`CMS_BRANCH`, oggi `dev`). Al rilascio il ramo pubblicato non
sarà più `dev`, e un CMS fermo lì farebbe pubblicare la redazione nel vuoto: articolo salvato,
preview aggiornata, sito pubblico no, nessun errore. Con la variabile il passaggio è una riga
nelle impostazioni, non una modifica al programma. Procedura in `docs/redazione-cms.md` §8.

**Nuovo `check:cms`**, dentro `npm run verify`: tiene allineati i campi del CMS e quelli dello
schema, e sorveglia il formato della data. Provato manomettendo la configurazione: intercetta
campo mancante, campo di troppo e formato data sbagliato.

**Non verificato**: il login OAuth vero e l'interfaccia del CMS. Richiedono un'applicazione OAuth
su GitHub, che può creare solo chi amministra l'account. Istruzioni in `docs/redazione-cms.md` §4.
Nel frattempo la redazione può entrare con un token personale, che è il meccanismo previsto da
Sveltia e resta nel browser di chi lo crea.

### Fase 3 — Dominio, indicizzazione, rilascio

**Un tranello disinnescato.** `site` usava `CF_PAGES_URL`, che sembra la variabile giusta e non lo
è: contiene l'URL del *deployment*, anche in produzione. Il sito pubblico avrebbe dichiarato come
canonico un indirizzo `*.pages.dev` invece di cognitariatzone.org, e la sitemap avrebbe elencato
quello — un modo silenzioso di regalare il proprio posizionamento a un dominio di servizio. Ora la
regola è: **la produzione dichiara il dominio pubblico, l'anteprima dichiara se stessa.**

Verificato costruendo nei tre contesti:

| Contesto | canonical | robots.txt | meta robots |
|---|---|---|---|
| locale | `cognitariatzone.org` | `Allow: /` + sitemap | index |
| anteprima (`CF_PAGES_BRANCH=dev`) | URL del deployment | `Disallow: /` | noindex |
| produzione (`CF_PAGES_BRANCH=main`) | `cognitariatzone.org` | `Allow: /` + sitemap | index |

Aggiunto `robots.txt`: mancava. Il `noindex` nelle pagine e il robots fanno due cose diverse e
servono entrambe — il primo dice «hai letto, non pubblicare», il secondo «non passare proprio».
Su produzione esclude `/admin/`, che non è contenuto da indicizzare.

**Sito editoriale e CMS non dipendono da pagamenti e registrazioni.** Verificato sul costruito:
home, blog, articolo, privacy e 404 non caricano né Supabase né Turnstile. L'articolo non carica
nemmeno un byte di JavaScript. I tre checkout continuano a rispondere 503.

**Il ramo di produzione non è stato verificato dalla configurazione.** Wrangler non è autenticato
su questa postazione e il pannello Cloudflare, aperto nel browser, ha reindirizzato al login: non
si entra in un account per conto di qualcun altro. La verifica per confronto di pagine non vale
come verifica della configurazione, e non viene spacciata per tale. Si chiude in un minuto in uno
dei due modi:

```
npx wrangler login && npx wrangler pages project list
```

oppure dal pannello: *Workers & Pages → cognitariat → Settings → Builds & deployments →
Production branch*.

### Manifesto

Testo invariato, firma «Editoriale», data 6 settembre 2026. Le correzioni proposte sono un
confronto puntuale in `docs/manifesto-verifiche-editoriali.md`: testo attuale, proposta, motivo.
Niente è stato applicato. Restano da chiudere prima della produzione il nome di Dario Amodei
(scritto «Claudio») e la chiamata all'iscrizione mentre il tesseramento è chiuso.

---

## Informativa, dati dell'ente, collaudo del CMS — 07/09/2026 (secondo giro)

Ramo `dev`. Nessun merge, nessun deploy in produzione.

### La sede smette di essere un tema pubblico

L'indicazione era chiara e la seguo: la sede in attesa di conferma **non è un blocco al rilascio**
e non deve comparire da nessuna parte, nemmeno come spiegazione.

Le pagine ora non contengono né gli indirizzi né una nota che dica cosa manca. Il campo `sede` in
`src/lib/associazione.ts` è vuoto, e le pagine rendono l'indirizzo **solo se valorizzato**: vuoto
vuol dire «non ancora confermato», e chi legge non vede niente invece di vedere un cantiere.
Quando la conferma arriva si scrive lì e si ricostruisce: nessuna pagina da toccare.

La questione, con i riferimenti documentali e la nota sulla coincidenza con una residenza, è
uscita dal repository pubblico e sta in `_local/sede-e-dati-riservati.md`, escluso da Git.

**Una cosa da sapere.** Il commit `995ebaa` di stamattina — fatto prima di questa indicazione —
ha portato entrambi gli indirizzi in `docs/dati-associazione.md` ed è già stato spinto: il file è
stato ripulito, ma il contenuto **resta nella cronologia pubblica**. Le tre opzioni (lasciare,
riscrivere la cronologia, chiedere a GitHub la rimozione delle cache) sono in
`_local/sede-e-dati-riservati.md` §2. Non è stata presa nessuna iniziativa perché riscritture e
force push sono stati vietati esplicitamente e `dev` è già pubblicato.

### L'informativa è un'informativa

`/privacy` non è più una nota sullo stato ma un testo ex art. 13 GDPR sui trattamenti che il sito
fa **adesso**. Per ciascuno: finalità, base giuridica, destinatari, conservazione, diritti.

| Trattamento | Base giuridica | Destinatari |
|---|---|---|
| Visita del sito, log tecnici | legittimo interesse (6.1.f) | Cloudflare (hosting) |
| Video incorporati, solo arrivando alla sezione | legittimo interesse (6.1.f), modalità nocookie e caricamento differito | Google (USA) |
| Corrispondenza: risposta | legittimo interesse (6.1.f) | Proton (Svizzera) |
| Corrispondenza: pubblicazione di un caso in forma riconoscibile | consenso (6.1.a); senza, trattamento anonimo | — |
| Accesso della redazione | legittimo interesse (6.1.f) | GitHub (USA) |

Tesseramento e pagamenti **non** sono taciuti perché spenti: una sezione dice che le pagine
esistono, che sono disattivate, che nessun dato passa di lì e che i loro trattamenti verranno
descritti prima che il primo dato sia raccolto.

Niente è stato dedotto dal codice: verificato sul sito online che non impostiamo cookie, che
`localStorage` e `sessionStorage` restano vuoti e che l'unico host di terze parti contattato è
`youtube-nocookie.com`. La conservazione della posta è descritta per quello che è — si tiene
finché serve, si cancella su richiesta, non c'è cancellazione automatica — senza inventare un
termine che nessuno ha deciso. Le decisioni che restano sono elencate in `_local/`, §4.

Versione dell'informativa a `v3-2026-09-07`.

### Dati dell'ente in un posto solo

`src/lib/associazione.ts` alimenta informativa, footer e dati strutturati (`foundingDate`,
`taxID`, `email`; l'indirizzo solo se valorizzato). Cambiano per via amministrativa, non
editoriale: da qui in poi un dato nuovo è una riga cambiata, non una pagina riscritta.

Il contatto pubblicato è `cognitariatz@proton.me`, che è l'indirizzo già in uso su tutto il sito e
nella corrispondenza: non è stato inventato. PEC e partita IVA non risultano dai documenti e
restano vuote — nessun recapito inventato.

### CMS: quanto si è potuto collaudare, e cosa manca

Nuovo `npm run check:cms-oauth <url>`: legge la configurazione servita al CMS e avvia il login
**senza completarlo**, controllando client id, permesso richiesto, indirizzo di ritorno e
attributi del cookie di stato. Oggi risponde 503 e stampa i passaggi esatti da fare
nell'account. Non stampa segreti.

Tolta una variabile dalla configurazione: l'origine del login non va più dichiarata a mano, il
sito ricava l'alias stabile del ramo (`dev.cognitariat.pages.dev`). Con l'URL del singolo
deployment il login avrebbe funzionato per una build e si sarebbe rotto alla successiva.
Verificato costruendo nei tre contesti: locale → dominio pubblico, anteprima → alias di ramo,
produzione → quello che si configura. Restano **due** variabili da impostare: client id e client
secret.

**Il collaudo end-to-end non è chiuso** e non lo sarà finché l'applicazione OAuth non esiste:
accesso reale, creazione bozza, caricamento copertina, salvataggio, pubblicazione e comparsa nel
blog. La simulazione del commit (18 controlli su 18) copre tutto il resto della catena, ma non
l'interfaccia e non il login. Il passaggio che serve è uno solo ed è nell'account di chi
amministra: creare l'applicazione OAuth e incollare due valori su Cloudflare.

### Ramo di produzione: ancora non verificato dalla configurazione

Wrangler non è autenticato qui; il pannello Cloudflare, aperto nel browser collegato, ha
reindirizzato al login, e in un account non si entra per conto di qualcun altro. Il confronto fra
pagine non vale come verifica e non viene usato come tale. Si chiude con
`npx wrangler login && npx wrangler pages project list`, oppure dal pannello in *Workers & Pages →
cognitariat → Settings → Builds & deployments*.

Tutto il resto della preparazione alla produzione è già pronto e parametrico: `CMS_BRANCH`,
`BRANCH_PRODUZIONE`, dominio pubblico e callback OAuth si impostano senza toccare il codice.

---

## Partita IVA confermata assente, e collaudo del cutover — 07/09/2026 (terzo giro)

Ramo `dev`. Nessun merge, nessun deploy in produzione.

### Partita IVA: da «da verificare» a dato

L'associazione ha confermato che **non ha partita IVA**. Non era deducibile: l'assenza in un atto
non prova l'assenza del dato, ed era infatti annotata come da verificare. Ora è un dato.

Nel modulo centrale è rappresentata come `null`, e la convenzione dei campi facoltativi diventa a
tre stati invece di due:

| Valore | Significato | Cosa succede sul sito |
|---|---|---|
| stringa piena | il dato c'è | compare |
| stringa vuota | non ancora confermato | non compare niente, nemmeno una nota |
| `null` | verificato che non esiste | non compare niente |

La differenza fra gli ultimi due non si vede in pagina ma si vede leggendo il file, ed è quella
che evita che qualcuno ricontrolli due volte la stessa cosa o inventi un valore per riempire il
buco.

**Il codice fiscale non la sostituisce.** Nei dati strutturati `taxID` porta il codice fiscale e
`vatID` non c'è, con un commento che dice di non aggiungerlo. Verificato sul sito costruito: la
stringa «partita IVA» non compare da nessuna parte, nel footer c'è solo il C.F., e nessun campo
vuoto viene reso visibile.

Tolta dai punti aperti in `docs/dati-associazione.md`, in `docs/informativa-privacy-bozza.md` e
nella documentazione interna. Sede e PEC restano dove stavano: la conferma sulla partita IVA non
le tocca.

### Collaudo del cutover, in un comando

`npm run check:produzione <url> [--produzione] [--ramo-cms <nome>]` guarda un sito pubblicato e
dice se è configurato come anteprima o come produzione, e se corrisponde a quello che ci si
aspetta. Serve due volte: prima del cutover puntandolo alla preview — deve dire «anteprima» —, e
dopo puntandolo al dominio vero.

Controlla: meta robots, robots.txt (aperto/chiuso, esclusione di `/admin/`, sitemap dichiarata),
dominio dichiarato in canonical e sitemap, assenza di bozze in elenco e sitemap, ramo e origine
del login del CMS, stato del login, e che i tre checkout rispondano ancora 503. È in sola lettura:
le uniche POST sono ai checkout, che devono rifiutare.

Sulla preview passa **11 controlli su 12**. L'unico rosso è il login del CMS non configurato, che
è esattamente il passaggio che richiede l'account di chi amministra.

Due falsi allarmi corretti mentre lo si scriveva, che valgono più del resto: il controllo sulle
bozze cercava `card-articolo-bozza` e trovava la **regola CSS**, che c'è sempre — ora cerca
l'attributo `class`, che c'è solo se una scheda è davvero marcata; e il controllo sul dominio
pretendeva l'uguaglianza esatta anche in anteprima, dove Cloudflare dà a ogni deployment un
indirizzo diverso e il sito dichiara quello. Un controllo che grida al lupo viene disattivato dopo
la seconda volta.

### Cosa resta, invariato rispetto a ieri

Il collaudo vero del CMS — accesso, bozza, copertina, salvataggio, pubblicazione — non è chiuso e
non lo sarà finché l'applicazione OAuth non esiste. La simulazione del commit e il controllo del
redirect coprono la catena intorno, non l'atto di pubblicare. Il ramo di produzione Cloudflare
resta da leggere dalla configurazione.
