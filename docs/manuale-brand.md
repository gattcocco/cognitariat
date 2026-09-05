# Manuale di brand — COG U

**Branch**: `dev` · **Fase 3** · 2026-09-05

I valori vivono in `src/styles/tokens.css`, che è l'unica fonte. Questo documento spiega *perché*
sono quelli e cosa non si può fare. Se serve un colore nuovo, si aggiunge lì, non nei componenti.

---

## 1. Palette

| | Hex | Ruolo |
|---|---|---|
| Rosa | `#E5376A` | accento di marca, pulsante primario, titoli grandi |
| Verde | `#477C48` | link, azioni secondarie, stati positivi |
| Nero | `#000000` | testo, superfici scure |
| Bianco | `#FFFFFF` | fondo principale |
| Giallo | `#F7D44A` | evidenziazione, focus su fondo scuro |

Sabbia e beige sono stati eliminati da pagina, sezioni e card. Dove servivano a separare
(fondi tenui, bordi) ora ci sono bianco più bordo, oppure `--giallo-tenue`.

## 2. Contrasti — verificati, non stimati

Calcolati secondo WCAG 2.1. AA richiede **4,5:1** per il testo normale e **3:1** per il testo
grande (≥24px, oppure ≥18,66px se grassetto).

| Coppia | Rapporto | Testo normale | Testo grande |
|---|---|---|---|
| nero / bianco | 21,00 | sì | sì |
| nero / giallo | 14,47 | sì | sì |
| nero / rosa | 5,09 | sì | sì |
| bianco / verde | 4,95 | sì | sì |
| verde / bianco | 4,95 | sì | sì |
| verde / nero | 4,24 | **no** | sì |
| rosa / bianco | 4,13 | **no** | sì |
| verde / giallo | 3,41 | **no** | sì |
| rosa / giallo | 2,85 | **no** | **no** |
| bianco / giallo | 1,45 | **no** | **no** |
| rosa / verde | 1,20 | **no** | **no** |

### Le tre regole che ne discendono

1. **Il pulsante primario è rosa con testo nero.** Col bianco starebbe a 4,13 e non passerebbe.
   Questo vale anche per il banner rosa in cima al sito.
2. **Il giallo non è mai colore di testo su bianco** (1,45). Si usa come fondo con testo nero,
   o come contorno di focus su fondo scuro.
3. **Rosa e verde non si accostano mai** (1,20), nemmeno in decorazioni con testo sopra.

### Verso degli hover

Il pulsante rosa ha testo nero, quindi il suo hover va **schiarito** (`#E84B79`, 5,71): scurendo
il rosa ci si avvicinerebbe al nero e il contrasto scenderebbe sotto soglia — un rosa scurito a
`#C22A58` sta a 3,77 e non passa. Il verde ha testo bianco, quindi il suo hover va **scurito**
(`#365E37`, 7,47). I due casi vanno in direzioni opposte: non uniformarli.

## 3. Stati

| Stato | Come si vede |
|---|---|
| Focus | contorno `--focus` 3px, staccato 2px. Nero sui fondi chiari, giallo dentro `.sezione-scura`, `.cta-section`, `.imaginarium` |
| Hover | vedi sopra; sui link cambia anche lo spessore della sottolineatura |
| Errore | testo **nero** su `--rosa-tenue`, bordo sinistro rosa e simbolo `⚠` prima del testo |
| Disabilitato | fondo bianco, testo `--nero-secondario`, bordo `--bordo-forte`, `cursor: not-allowed` |
| Campo non valido | `aria-invalid="true"` → bordo rosa a 2px, oltre al messaggio |

**Nessuno stato è comunicato dal solo colore** (WCAG 1.4.1): l'errore ha simbolo e bordo, i link
hanno la sottolineatura, il pallino attivo dello slideshow è anche più grande.

**Bordo dei campi**: `--bordo-campo` è `rgba(0,0,0,0.45)`, cioè 3,35:1 su bianco. WCAG 1.4.11
chiede almeno 3:1 per i confini dei controlli. Non abbassarlo per ragioni estetiche: un bordo
appena accennato rende il campo invisibile a chi ha vista ridotta.

## 4. Tipografia

- **Titoli, corpo, etichette e controlli**: Inter. La gerarchia si fa col peso (800 / 700 / 600),
  **non col maiuscolo**. Non cambia niente in Fase 5.
- **Annotazioni**: Shantell Sans, peso medio (500), poche e brevi. `--font-annotazioni`.
  Nel sito entra in un punto solo: `.nota-metodo`, il commento a margine del testo.
- **Schwa (ə)**: verificata nel file effettivamente pubblicato, non presunta.

### I font sono ospitati da noi

Dalla Fase 5 non c'è più nessun `<link>` verso fonts.googleapis.com né verso cdnjs: i file stanno
in `public/fonts/`, gli `@font-face` in `src/styles/font.css`, le icone sono SVG disegnati in
`src/components/Icona.astro`. Il sito non contatta nessuna terza parte per rendersi leggibile.

Entrambi i font sono **SIL Open Font License 1.1**, che consente l'hosting e la ridistribuzione
purché licenza e avviso di copyright viaggino con i file: stanno in `public/fonts/`, versionati.
È l'opposto del certificato Envato di Doodle Lines, che è personale e resta in `_local/`.

I due file `-ext-sub` sono sottoinsiemi ridotti ai segni latini estesi che usiamo davvero
(28 KB invece di 133 per Inter). `npm run check:glifi` confronta gli unicode-range dichiarati con
i caratteri presenti nell'HTML costruito e fallisce se qualcosa non è coperto: senza quel controllo
un carattere nuovo tornerebbe in silenzio al font di sistema.

### Perché Shantell Sans, e cosa è stato scartato

Tre candidati provati sulle stesse frasi in `_local/campionario/confronto-font.html`:

| Font | Carattere | Schwa nel file | Esito |
|---|---|---|---|
| **Shantell Sans** | pennarello, irregolare ma controllato | **sì**, disegnata dal font | **scelto** |
| Kalam | scrittura più morbida e quotidiana | **no**: il browser ripiega sul font di sistema | scartato |
| Caveat | corsivo leggero e spontaneo | sì | tenuto come alternativa |

La prova della schwa non è un dettaglio: il sottoinsieme `latin-ext` di Google *copre l'intervallo*
che contiene U+0259, ma l'intervallo non è il glifo. Kalam ha l'intervallo e non il glifo, e le
parole «Studentə» e «Cognitariə» — che nel sito ci sono — sarebbero uscite con una lettera presa da
un altro carattere.

### Doodle Lines: incorporabile, ma fuori dal sito

La Envato Elements License **consente** l'incorporamento web:

> «You can incorporate a web-enabled Font as part of an End Product, but your End Product must not
> encourage or facilitate users to extract the Font or create new text using it.»

Da cui tre regole, se un giorno lo si attiva: solo WOFF2 (mai `.ttf`/`.otf`, servirebbe il file
installabile), nessuno strumento che generi testo in quel font, uso limitato alle annotazioni.

**Resta però il punto che lo tiene fuori**: la licenza dice che il font può essere usato solo
dallə sottoscrittorə e non trasferito ad altri, «even another person within the same company or a
client». Il licenziatario è una persona fisica, il sito è dell'associazione. Finché non è chiarito,
il posto delle annotazioni è di Shantell Sans, che quel problema non ce l'ha.
Vedi `_local/licenze-e-originali/INVENTARIO.md`.

## 5. Animazione d'ingresso

Sequenza, ritmo e transizioni restano quelli di partenza. Cambia da dove arriva il codice e come
si comporta quando qualcosa va storto — quattro casi, tutti provati (registro Fase 5):

- **normale**: anime.js arriva dal nostro bundle (import dinamico, chunk separato), l'intro parte
  e si pulisce da sola;
- **lento**: il failsafe scopre la pagina a 3 secondi. Se il modulo atterra dopo, **rinuncia**:
  `window.__coguRivelato` gli dice che qualcuno sta già leggendo, e non cala di nuovo il pannello;
- **fallito**: il modulo non arriva, il `catch` scopre la pagina. Nessun testo resta invisibile;
- **movimento ridotto**: lo script in `BaseLayout` esce prima di applicare il gate CSS, il chunk di
  anime.js **non viene nemmeno scaricato**, e l'hero è visibile dal primo istante.

Il failsafe non si limita a togliere la classe: rimuove l'overlay e riporta a stato finale le
parole del titolo, che hanno un `opacity` inline. Senza quel secondo pezzo, una timeline bloccata
lasciava un H1 invisibile sotto un pannello nero orfano.

Un'accortezza da non perdere: l'animazione avvolge ogni parola del titolo in
`<span class="cogu-w">` per animarle in cascata. La regola che colora la parola chiave è perciò
`.hero-content h1 span:not(.cogu-w)` — senza `:not()` l'intero titolo diventa rosa.

## 6. Campionario

`_local/campionario/index.html`, fuori dalla build pubblica. Contiene titoli, paragrafi, link,
pulsanti (inclusi disabilitati), form con errore, i tre esempi illustrati, la prova dello schwa e
la lista dei controlli manuali. Legge i CSS veri dal sorgente, quindi non va tenuto allineato a mano.

Per aprirlo servendo la radice del repo:

```bash
npx http-server . -p 8799
# poi http://127.0.0.1:8799/_local/campionario/index.html
```

## 7. Illustrazioni

Dosaggio: **massimo tre presenze nella home**, una per passaggio narrativo (la domanda sul lavoro,
l'esplorazione delle alternative, l'invito a partecipare). Non una per card.

Mai dentro form, messaggi di errore o testi legali. Decorative con `alt=""`; informative con
alternativa concisa.

**Attenzione al formato dei sorgenti**: i PNG dei pacchetti sono verticali e molto alti (fino a
532×1114) con molto spazio bianco. A tutta larghezza producono card lunghissime. Vanno ritagliati
ed esportati per il web prima dell'integrazione, con dimensioni dichiarate per evitare
spostamenti di layout.
