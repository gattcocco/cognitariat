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

- **Titoli e corpo**: Inter. La gerarchia si fa col peso (800 / 700 / 600), **non col maiuscolo**.
- **Annotazioni**: Doodle Lines, poche e brevi. `--font-annotazioni`.
- **Schwa**: il fallback (`Segoe UI`, `system-ui`) copre `ə`. Il campionario ha una prova
  dedicata: se in una riga lo schwa appare come rettangolo vuoto, quel fallback non va usato.

### Doodle Lines non è pubblicato

Il file del font sta **solo** in `_local/`, non in `public/`, non nel repository. Nel sito
`--font-annotazioni` dichiara la famiglia ma **non esiste alcun `@font-face`**: il browser ripiega
sul fallback e il file non viene mai richiesto.

Resta così finché non è verificato che la licenza Envato Elements copra l'incorporamento web per
questo item. La licenza è registrata al progetto giusto («Cognitariato sito», codice `3Q4NXLYW6F`),
ma il permesso di `@font-face` è una questione separata.

## 5. Animazione d'ingresso

Preservata così com'era: sequenza, ritmo, transizioni e failsafe a 3 secondi se il modulo
anime.js non parte. `@media (prefers-reduced-motion: reduce)` nasconde l'overlay, e il gate CSS
`html.cogu-intro` è applicato via JS solo quando il movimento ridotto **non** è richiesto — quindi
senza JS l'hero resta visibile.

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
