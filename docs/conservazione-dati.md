# Per quanto si conservano i dati — quello che è pubblicato e quello che resta da deliberare

L'art. 13.2.a del GDPR chiede di dichiarare **il periodo di conservazione oppure, se non è
possibile indicarlo, i criteri** con cui viene determinato. Le due cose sono alternative, non una
il ripiego dell'altra: un criterio scritto in modo verificabile soddisfa la norma quanto un numero.

Quello che **non** soddisfa la norma è tacere, e quello che non si può fare è scrivere online un
termine che nessuno ha deliberato — diventerebbe una promessa che nessuno sta mantenendo.

Quindi: su `/privacy` ogni trattamento dichiara oggi un periodo o un criterio, e sono tutti veri.
Qui sotto ci sono le decisioni che l'associazione può prendere per sostituire ai criteri dei
termini precisi, con una proposta concreta per ciascuna. **Nessuna di queste proposte è stata
applicata né è descritta online come se fosse in vigore.**

---

## 1. Situazione al 07/09/2026

| Trattamento | Cosa dice `/privacy` oggi | Serve una decisione? |
|---|---|---|
| Visita del sito (dati tecnici, Cloudflare) | Non esiste un nostro archivio: nessuna statistica, nessun log scaricato. Presso il fornitore valgono i suoi tempi. | **No.** Non c'è niente di nostro da conservare. Diventa una decisione solo se un giorno si accende uno strumento di statistica. |
| Video | Nessun dato: sono link, non incorporamenti. | **No.** |
| Corrispondenza | Criterio d'uso: finché serve a seguire la questione; cancellazione su richiesta; nessuna cancellazione automatica. | **Sì** — §2. |
| Accesso della redazione (GitHub) | Attribuzione nella cronologia del repository a tempo indeterminato; il codice di accesso è revocabile dal proprio account. | **No.** È la natura di un sistema di versionamento, ed è dichiarata. |
| Tesseramento e pagamenti | Disattivati, nessun dato raccolto. | **Sì, ma dopo** — §3, prima della riapertura. |

## 2. La corrispondenza — proposta da confermare

Oggi la casella `cognitariatz@proton.me` è l'unico canale da cui arrivano dati, e non c'è nessuna
regola di cancellazione: i messaggi restano finché qualcuno non li toglie a mano. Il criterio
pubblicato descrive esattamente questo, senza abbellirlo. Ma una casella che non si svuota mai
diventa, col tempo, un archivio di persone che hanno raccontato problemi di lavoro — cioè la cosa
più delicata che questa associazione maneggi.

**Proposta, in quattro righe che possono essere deliberate così come sono:**

> 1. La corrispondenza che si esaurisce in una risposta si cancella **entro 24 mesi** dall'ultimo
>    messaggio scambiato.
> 2. La corrispondenza relativa a un caso seguito dall'osservatorio si conserva finché quel lavoro
>    è aperto e **per 12 mesi** dopo la sua chiusura; poi si cancella, oppure se ne conserva solo
>    la forma anonima, che non è più un dato personale.
> 3. La corrispondenza che riguarda una vertenza, una diffida o un contenzioso in corso si
>    conserva finché serve a far valere o difendere il diritto, e si valuta caso per caso: qui un
>    termine uguale per tutti farebbe più danni che bene.
> 4. La cancellazione su richiesta resta possibile in ogni momento e ha la precedenza su tutti i
>    termini sopra, salvo il punto 3.

**Cosa comporta approvarla.** Serve che qualcuno lo faccia davvero: una revisione della casella
una volta l'anno, con la data dell'ultimo scambio come riferimento. Non serve nessuno strumento —
la ricerca per data della webmail basta — ma serve che sia il compito di una persona precisa.
Senza quello, il termine scritto online sarebbe falso, e sarebbe peggio del criterio di adesso.

**Se non si approva**, l'informativa resta com'è: il criterio è legittimo e vero. Non è una
scadenza che incombe.

## 3. Prima di riaprire tesseramento e pagamenti

Non serve adesso — non si raccoglie niente — ma è l'elenco che andrà riempito, e conviene sapere
che esiste:

- **Registro degli iscritti**: per la durata del rapporto associativo e per il tempo in cui
  l'associazione deve poterlo dimostrare (contributi, assemblee, quote).
- **Documenti contabili e fiscali**: **dieci anni**, art. 2220 c.c. Non è una scelta
  dell'associazione, è un obbligo di legge, e prevale sulla richiesta di cancellazione.
- **Dati presso Stripe**: seguono la conservazione del fornitore; noi non ne teniamo copia oltre
  l'identificativo del pagamento.
- **Prova dell'accettazione dell'informativa** (`privacy_acceptances`): finché serve a dimostrare
  che il consenso c'è stato, cioè almeno quanto il rapporto associativo.

Questi vanno scritti nell'informativa **prima** che il primo dato venga raccolto, non dopo: è già
quello che la pagina promette nella sezione 6.

## 4. Come si applica una decisione

Quando una proposta viene approvata:

1. si sostituisce il criterio con il termine nella sezione corrispondente di `src/pages/privacy.astro`;
2. si aggiorna `PRIVACY_POLICY_VERSION` in `src/lib/consent.ts` e si aggiunge la nuova versione
   all'elenco in `supabase/migrations/0007_consenso_privacy_esplicito.sql`;
3. si annota qui la data della delibera, così che fra un anno si sappia da dove viene il numero.

**Delibere registrate finora: nessuna.**
