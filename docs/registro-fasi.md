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
