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
