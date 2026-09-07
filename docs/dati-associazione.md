# Dati dell'associazione usati dal sito

I dati dell'ente stanno in un posto solo, `src/lib/associazione.ts`, e da lì arrivano
all'informativa, al footer e ai dati strutturati. Cambiano per via amministrativa, non
editoriale: quando ne arriva uno nuovo si aggiorna quel file e si ricostruisce, senza toccare
nessuna pagina.

Ricavati dalla lettura, in sola lettura, dei documenti conservati in locale: atto costitutivo
registrato, statuto, verbale di nomina.

**Qui ci sono solo dati dell'ente.** I documenti firmati, i nomi dei soci fondatori e i dati
personali del legale rappresentante restano nell'archivio locale e non entrano nel repository,
nella build né nei log.

---

## 1. Dati verificati e pubblicati

| Dato | Valore | Dove risulta |
|---|---|---|
| Denominazione | COG U — Sindacato del Cognitariato | atto costitutivo, intestazione e art. 1; statuto art. 1 |
| Forma giuridica | associazione sindacale **non riconosciuta**, artt. 36 ss. c.c. e art. 39 Cost. | atto costitutivo, art. 1 |
| Natura | libera, democratica, apartitica, autogestita, federalista, **senza fini di lucro** | statuto, art. 2 |
| Indipendenza | da partiti, governi, confessioni religiose e organizzazioni datoriali | atto costitutivo, art. 1 |
| Data di costituzione | **12 luglio 2026**, a Milano | atto costitutivo |
| Registrazione | Agenzia delle Entrate, Direzione provinciale II — Ufficio territoriale Milano 6 | timbri sull'atto |
| Codice fiscale | **98031460151** | verbale del 3 settembre 2026 |
| Durata | a tempo indeterminato | atto costitutivo, art. 7 |
| Patrimonio iniziale | 100 € versati dai soci fondatori | atto costitutivo, art. 6 |
| Contatto | `cognitariatz@proton.me` | indirizzo già in uso sul sito e nella corrispondenza |
| Finalità | rappresentare e tutelare chi lavora nel cognitariato; contrattazione collettiva e azione sindacale; mutualismo; contrasto a sfruttamento e precarizzazione; contrattazione e governance democratica dell'AI | atto art. 3; statuto art. 3 |

Sulla costituzione legale non c'è margine di dubbio: l'associazione esiste dal 12 luglio 2026 e
l'atto è registrato. I servizi online — tesseramento, pagamenti, area membro — sono un'altra cosa
e sono ancora in preparazione. Le due affermazioni non si contraddicono.

## 2. Campi facoltativi, non ancora valorizzati

`sede` e `pec` sono stringhe vuote in `src/lib/associazione.ts`. Vuoto significa **non ancora
confermato**, mai «non esiste»: le pagine li rendono solo se valorizzati, quindi finché sono vuoti
sul sito non compare né l'indirizzo né una nota che spieghi cosa manca.

- **Sede legale** — aggiornamento amministrativo pendente. La questione, con i riferimenti
  documentali, sta nella documentazione interna in `_local/`, fuori dal repository.
- **PEC** — non risulta dai documenti letti. Se esiste, si aggiunge.
- **Partita IVA** — non risulta; plausibilmente non c'è, trattandosi di associazione senza fini di
  lucro. Da confermare, non da dedurre.

Nessuno di questi impedisce la pubblicazione del sito: l'art. 13 GDPR chiede identità e dati di
contatto del titolare, e sono pubblicati — denominazione, forma giuridica, data di costituzione,
codice fiscale e un indirizzo email attivo a cui esercitare i diritti.

## 3. Base giuridica dell'art. 9, per quando apriranno le iscrizioni

Non serve al rilascio editoriale — oggi nessun dato di appartenenza sindacale viene raccolto — ma
la documentazione ora dice qualcosa di preciso: l'ente è un'associazione sindacale non
riconosciuta ex art. 39 Cost. con finalità sindacali statutarie, cioè la fattispecie che l'art.
9.2.d contempla («organizzazione con finalità sindacale, dati dei propri iscritti»). Resta una
valutazione di chi segue la compliance, ma su documenti che ci sono.

## 4. Dove finiscono questi dati

| Dove | Cosa compare |
|---|---|
| `/privacy` | titolare completo: denominazione, forma giuridica, data di costituzione, codice fiscale, contatto |
| footer di ogni pagina | denominazione, forma giuridica, data di costituzione, codice fiscale |
| dati strutturati (JSON-LD) | `foundingDate`, `taxID`, `email`; l'indirizzo solo se valorizzato |
