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
| Visita del sito (dati tecnici, Cloudflare) | Presso di noi: niente, e non per scelta di stile — l'esportazione dei log è una funzione Enterprise, disattivata di default, quindi con il nostro piano non possiamo consultarli. Presso Cloudflare: i log **esistono**, e i tempi li decide Cloudflare. | **No**, ma vedi §1.1: quello che il fornitore fa non è una nostra decisione, ed è la parte che non possiamo verificare. |
| Video | Nessun dato: sono link, non incorporamenti. | **No.** |
| Corrispondenza | Criterio d'uso: finché serve a seguire la questione; cancellazione su richiesta; nessuna cancellazione automatica. | **Sì** — §2. |
| Accesso della redazione (GitHub) | Attribuzione nella cronologia del repository a tempo indeterminato; il codice di accesso è revocabile dal proprio account. | **No.** È la natura di un sistema di versionamento, ed è dichiarata. |
| Tesseramento e pagamenti | Disattivati, nessun dato raccolto. | **Sì, ma dopo** — §3, prima della riapertura. |

### 1.1 Cosa è verificato e cosa no, sui log di Cloudflare

La distinzione che conta non è fra «conserviamo» e «non conserviamo»: è fra **il nostro archivio**
(che non esiste) e **quello del fornitore** (che esiste, e non lo governiamo noi).

**Verificato da noi, sul sito online l'08/09/2026:**

- nessun cookie impostato (nessuna intestazione `Set-Cookie` nelle risposte);
- nessun beacon di Cloudflare Web Analytics nelle pagine: l'analitica non è attiva;
- le risposte portano le intestazioni `NEL` e `Report-To` della piattaforma, che chiedono al
  browser di segnalare gli **errori** di rete a `a.nel.cloudflare.com`, con
  `success_fraction: 0.0` — cioè solo i fallimenti, non le visite riuscite. Le imposta Cloudflare,
  non noi, e su un indirizzo `pages.dev` non sono nostre da togliere.

**Dichiarato da Cloudflare, non verificabile da noi:**

- che i log di accesso siano scartati **entro quattro ore** per la maggior parte dei clienti, e
  conservati per impostazione predefinita tre giorni per i clienti Enterprise che ne chiedono
  l'esportazione (dichiarazione pubblica di Cloudflare);
- la sua informativa **non fissa** un termine numerico generale: parla di conservazione «per il
  tempo coerente con le finalità e con gli obblighi di legge».

**Quello che non sappiamo, e che non va scritto come se lo sapessimo**: quale di questi tempi si
applichi in concreto al nostro progetto. Nessuno strumento a nostra disposizione lo mostra. Il
piano gratuito di Pages non espone né i log delle richieste né la loro configurazione di
conservazione.

Se un giorno servisse una risposta certa — per esempio perché qualcuno esercita un diritto e
chiede quanto restano i dati della sua visita — l'unica strada è chiederla a Cloudflare per
iscritto, come responsabile del trattamento. Non è una cosa che si deduce da fuori.

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
