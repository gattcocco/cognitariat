# Informativa privacy — la parte che riguarda tesseramento e pagamenti

**L'informativa del sito è pubblicata**: `/privacy` è oggi un'informativa ex art. 13 GDPR sui
trattamenti realmente attivi — visita del sito e log dell'hosting, video incorporati,
corrispondenza, accesso della redazione — con titolare, finalità, basi giuridiche, destinatari,
conservazione e diritti.

Questo file conserva la parte che **non** è ancora pubblicata perché riguarda trattamenti che non
avvengono: iscrizione, quota associativa, area membro. Va aggiunta all'informativa **prima** che
il primo dato di tesseramento venga raccolto, non dopo.

Denominazione, forma giuridica, data di costituzione e codice fiscale non sono più fra i campi da
completare: sono in `src/lib/associazione.ts` e già online. Restano da valorizzare la sede (campo
facoltativo, aggiornamento amministrativo pendente) e la PEC, se esiste.

## Cosa serve prima di pubblicare questa parte

1. **Dati dell'ente ancora mancanti** — sede legale (aggiornamento amministrativo pendente),
   partita IVA se esiste, PEC se esiste. Denominazione, forma giuridica, data di costituzione e
   codice fiscale sono già in `src/lib/associazione.ts` e online.
2. **Base giuridica art. 9** — va verificato con chi segue la compliance se la forma giuridica
   e le attività reali di COG U rientrano nell'eccezione dell'art. 9.2.d (organizzazione con
   finalità sindacale, dati dei propri iscritti). Non è un'assunzione automatica.
3. **Retention matrix** — cosa si cancella subito, cosa si anonimizza, cosa l'ente deve
   conservare per obblighi contabili e per quanto (piano §6). Finché non è definita non va
   pubblicato nessun periodo di conservazione.
4. **Audit terze parti** — piano §4. Da rifare al momento dell'apertura: font e icone ora sono
   serviti dal nostro dominio, ma tornano in gioco Supabase Auth, Stripe e Turnstile.
5. **Versione dell'informativa** — `PRIVACY_POLICY_VERSION` in `src/lib/consent.ts` deve
   coincidere con la versione registrata lato server in una **nuova** migration (vedi il
   commento in quel file e `supabase/migrations/0005_privacy_acceptances.sql`).

---

## 1. Titolare del trattamento

Il titolare del trattamento è **[Denominazione legale completa dell'associazione]**, con sede in
**[Sede legale]**, Codice Fiscale **[CF]** [/ Partita IVA **[P.IVA]**], contattabile
all'indirizzo cognitariatz@proton.me [ed alla PEC [PEC], se presente].
[Referente/DPO per la privacy: [nominativo e contatto], se nominato.]

## 2. Quali dati raccogliamo

Al momento dell'iscrizione raccogliamo: nome, cognome, indirizzo email, fascia di tesseramento
scelta (Studentə/disoccupatə o Cognitariə — quota 2026, pagamento unico) e i metadati del
pagamento. Non i numeri di carta: quelli non transitano né vengono mai memorizzati sui nostri
sistemi, li gestisce esclusivamente il fornitore di pagamenti, Stripe.

Chiediamo facoltativamente anche il **Codice Fiscale** — al momento non è obbligatorio, in
attesa di una verifica con la contabilità sulla sua reale necessità; se lo comunichi resta solo
nei nostri sistemi e non viene mai inviato a Stripe.

Chi versa un **contributo sostenitore** (senza prendere la tessera) non compare affatto nei
nostri sistemi: il pagamento è gestito interamente da Stripe, in forma anonima per noi, come
per gli acquisti di merchandising.

## 3. Perché trattiamo questi dati e su quale base giuridica

Trattiamo nome, email e dati di pagamento per fornire il servizio di iscrizione e i benefit
associati (art. 6.1.b GDPR — esecuzione di un contratto) e, dove richiesto, sulla base del
consenso espresso (art. 6.1.a GDPR).

La **fascia di tesseramento**, in un contesto sindacale, può rivelare l'appartenenza a
un'organizzazione sindacale: la trattiamo come dato di categoria particolare ai sensi
dell'art. 9 GDPR. [**Da verificare**: se la forma giuridica e le attività di COG U rientrano
nell'eccezione art. 9.2.d, il trattamento si basa su quella previsione; in ogni caso chiediamo
separatamente, al momento dell'iscrizione, un consenso esplicito dedicato a questo dato.]

## 4. A chi comunichiamo i dati

- **Supabase** (autenticazione e database, regione UE): conserva i dati di account e iscrizione.
- **Stripe** (pagamenti): gestisce il pagamento della quota e i relativi obblighi fiscali.
  Stripe Inc. ha sede negli Stati Uniti ma aderisce alle Clausole Contrattuali Standard UE.
- **Cloudflare** (Turnstile anti-spam sul modulo di iscrizione; hosting del sito): riceve i dati
  tecnici minimi per verificare che la richiesta non provenga da un bot.

Non vendiamo né cediamo i dati a terzi per finalità di marketing.

## 5. Per quanto tempo conserviamo i dati

[**Da completare dopo aver definito la retention matrix** (piano §6): quali dati vengono
cancellati subito alla fine dell'iscrizione, quali anonimizzati, quali l'ente deve conservare
per obblighi amministrativi o contabili e per quanto tempo. Non pubblicare un periodo di
conservazione specifico prima di questa verifica.]

## 6. I tuoi diritti

Accesso, rettifica, cancellazione, portabilità, opposizione: scrivendo a cognitariatz@proton.me.
Dall'area membro si può anche richiedere la cancellazione dell'account. [Cosa viene cancellato,
cosa anonimizzato e cosa conservato per obblighi contabili va precisato qui una volta definita
la retention matrix.] Resta il diritto di reclamo al Garante per la protezione dei dati
personali (garanteprivacy.it).

## 7. Cookie e tecnologie simili

[**Da completare con un audit terze parti prima dell'apertura** — piano §4. Alla data di questa
bozza il sito contatta:]

- un cookie/token di sessione impostato da Supabase Auth all'accesso, verosimilmente
  qualificabile come strettamente necessario (da confermare in sede di audit);
- il widget Cloudflare Turnstile e i cookie impostati da Stripe sul proprio dominio durante il
  pagamento (pagina ospitata da Stripe, non dal nostro sito);
- gli embed video YouTube in modalità "nocookie".

Font e icone non sono più fra le terze parti: dalla Fase 5 sono serviti dal nostro dominio.

[Fino al completamento dell'audit, non dare per scontato che non serva un banner di consenso.]

## 8. Sicurezza

I dati sono conservati su infrastrutture con sede nell'Unione Europea (Supabase, regione UE) e
trasmessi via connessioni cifrate (HTTPS/TLS). I pagamenti sono gestiti interamente da Stripe:
non vediamo né conserviamo mai i dati della carta.
