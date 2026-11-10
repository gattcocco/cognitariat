---
title: "Un'IA nostra, in locale: vademecum per un sindacato del cognitariato"
bozza: false
date: 2026-11-10
autore: Editoriale
excerpt: Cosa leggere, cosa installare e quali domande farsi prima di far girare un assistente sui documenti del sindacato. Con le fonti controllate una per una.
copertina:
  file: /images/articoli/vademecum-ia-locale.webp
  alt: "Sfondo nero con la scritta «Vademecum. Un'IA nostra, in locale.» in bianco e rosa, e la sigla COG U."
notaRedazione: "Le fonti di questo vademecum sono state controllate una per una il 10 novembre 2026. L'elenco da cui siamo partiti conteneva alcune imprecisioni, tra cui queste, corrette qui: un rapporto citato con un titolo che non esiste (è la guida GWAIA dell'Institute for the Future of Work, scritta per il TUC), la data dello standard SCI for AI (ratificato a dicembre 2025, non nel 2026) e la licenza di Open WebUI, che non è più open source. Tutte le voci sono nella Biblioteca."
---

Un sindacato che vuole usare l'intelligenza artificiale ha due strade. Può abbonarsi a un servizio commerciale e mandare i propri documenti a un'azienda che non controlla, oppure può costruirsi uno strumento che gira su macchine sue e risponde a chi lo usa. Questo vademecum riguarda la seconda strada. Non si tratta di installare una chat, ma di mettere in piedi un piccolo bene comune digitale.

I criteri sono cinque. Lo strumento deve girare **in locale**, su computer o server del sindacato, senza appoggiarsi a servizi esterni. Deve usare **modelli scaricabili** che si possano cambiare. Deve essere **sobrio**: modelli piccoli, hardware che c'è già, consumi misurati. Deve essere **governato da chi lo usa**: iscritte, iscritti e delegate decidono a cosa serve e a quali documenti accede. E deve essere **utile al collettivo** senza diventare uno strumento di sorveglianza.

## Una contraddizione da dichiarare subito

«In locale» non vuol dire «fuori dall'oligopolio». I modelli che si possono scaricare li pubblicano in gran parte le stesse aziende che combattiamo. E «pesi scaricabili» non significa «open source»: l'[Open Source Initiative lo spiega bene](/biblioteca/#open-weights-not-quite-what-youve-been-told). Senza codice di addestramento, dati e punti di controllo non si può né ricostruire né verificare cosa c'è dentro, e la licenza decide cosa si può fare.

Quello che l'approccio locale dà davvero è meno, ma non è poco: nessun dato esce dal sindacato, nessuna chiave d'accesso da pagare, e la possibilità di sostituire il modello senza buttare il resto. Chi vuole spingersi oltre può guardare a modelli rilasciati con codice, dati e punti di controllo pubblici, come quelli di [Allen AI](https://allenai.org/olmo), tenendo presente che di solito sono meno potenti. In ogni caso la licenza si legge prima, caso per caso. E l'energia spesa per addestrare quei modelli è già stata spesa: usarli in locale non la cancella.

## Il più sobrio è spesso non generare

Il paper [Power Hungry Processing](/biblioteca/#power-hungry-processing) ha misurato l'energia di mille richieste su compiti diversi. Risultato: i modelli generativi multiuso costano ordini di grandezza più dei sistemi specializzati, anche a parità di parametri. Per un sindacato la prima domanda non è «quale chat installiamo?» ma «ci serve davvero che il sistema scriva?».

Per ritrovare l'articolo giusto in un contratto collettivo basta una ricerca che capisce il significato delle parole e restituisce i passaggi con la fonte. Se serve anche una risposta in linguaggio naturale, si aggiunge dopo, con un modello piccolo che risponde solo a partire da quei passaggi. Questa è l'idea del [RAG](/biblioteca/#retrieval-augmented-generation-for-knowledge-intensive-nlp-tasks): la conoscenza sta in una base di documenti che si può aggiornare, non nei pesi del modello.

Poi si misura. Con [CodeCarbon](/biblioteca/#codecarbon) si confrontano modelli e macchine con numeri propri. E [From Cradle to Cloud](/biblioteca/#from-cradle-to-cloud) ricorda che la corrente consumata mentre si usa il sistema è solo una parte del conto: ci sono anche la fabbricazione dell'hardware, l'acqua, lo smaltimento. Un server tenuto acceso per chi lo usa una volta a settimana consuma comunque.

## Cosa leggere, e in che ordine

**Prima: a cosa serve e chi decide.** [Design Justice](/biblioteca/#design-justice) e [Data Feminism](/biblioteca/#data-feminism) sono ad accesso libero e danno il quadro per decidere insieme usi permessi, responsabilità e proprietà dei dati. Per il lato sindacale: il [toolkit del TUC](/biblioteca/#tuc-generative-ai-policy-toolkit), la [guida GWAIA](/biblioteca/#gwaia-guide-for-workplace-reps) per coinvolgere chi lavora nella valutazione di un sistema, e il rapporto di [UNI Global Union](/biblioteca/#algorithmic-management-opportunities-for-collective-action) sulla gestione algoritmica. Il toolkit e la guida GWAIA sono scritti per il Regno Unito: la parte giuridica va riletta con il diritto italiano ed europeo.

**Poi: un prototipo piccolo.** [Hands-On Large Language Models](/biblioteca/#hands-on-large-language-models) e il paper sul RAG, con la documentazione di [Ollama](/biblioteca/#ollama) o [llama.cpp](/biblioteca/#llama-cpp). Si parte da documenti pubblici o non sensibili, come i contratti collettivi.

**Poi: ottimizzare e misurare.** [Sustainable AI](/biblioteca/#sustainable-ai), Power Hungry Processing, CodeCarbon e lo standard [SCI for AI](/biblioteca/#sci-for-ai) per darsi criteri di sostenibilità.

**Infine: un pilota con le rappresentanti.** Domande vere, risposte verificate da una persona, permessi sui documenti rispettati e una procedura per correggere gli errori, prima di coinvolgere le iscritte e gli iscritti. Prima di collegare un modello ai documenti conviene leggere anche l'[OWASP Top 10 per le applicazioni LLM](/biblioteca/#owasp-top-10-for-llm-applications-2025).

Se bisogna comprare due libri, sono quelli a pagamento: *Hands-On Large Language Models* e *Sustainable AI*. *Design Justice* e *Data Feminism* si leggono gratis. Per capire cosa promettono i venditori di sistemi, *AI Snake Oil* serve a chi tratta con le aziende.

## Gli strumenti

**llama.cpp** è il motore che fa girare i modelli in locale anche su processore, con la quantizzazione che li rende leggeri. **Ollama** è il modo più semplice per cominciare: va bene per un prototipo senza costruire tutto lo strato sotto. **Open WebUI** dà un'interfaccia di chat con basi di conoscenza, ma attenzione: dalla versione 0.6.6 ha una licenza propria con una clausola sul marchio che pesa oltre una certa soglia di utenti. Non è open source, e un sindacato la deve leggere prima di adottarla.

Il consiglio pratico è provare modelli da 3 a 8 miliardi di parametri, quantizzati a 4 bit, su macchine che già abbiamo. Si misurano qualità delle risposte, tempi, consumo elettrico e costi di gestione. Quale sia l'opzione più sobria dipende dall'uso reale.

L'architettura, in breve: le persone autorizzate arrivano a un'interfaccia locale, governata da regole decise insieme; un modello piccolo risponde solo con ciò che trova nella base di conoscenza (contratti, accordi, regolamenti, domande frequenti); ogni risposta porta le fonti e passa dalla verifica di una persona. Nessuna decisione legale automatica, nessuna sorveglianza nascosta. Recupero dei documenti, accessi, cifratura e permessi non si ottengono da soli: vanno costruiti e provati.

## Cinque domande per governare il progetto

1. **Proprietà collettiva.** Possiamo spostare modelli, software e dati senza perdere il controllo?
2. **Riservatezza.** I documenti o i dati personali di una categoria possono diventare visibili a un'altra?
3. **Potere di chi lavora.** Chi può contestare una risposta sbagliata, aggiornare la base di conoscenza o spegnere il sistema?
4. **Sostenibilità.** Quanta energia e quanto hardware servono per ogni risposta utile e verificata?
5. **Utilità democratica.** Rafforza la competenza collettiva e il potere delle iscritte e degli iscritti, o sostituisce le rappresentanti?

## Il nodo legale

Un'informazione che rivela l'appartenenza a un sindacato è un dato di categoria particolare: l'articolo 9 del [regolamento europeo sulla protezione dei dati](https://eur-lex.europa.eu/eli/reg/2016/679/oj) ne vieta in via generale il trattamento. Esiste un'eccezione per le organizzazioni senza scopo di lucro con finalità sindacali, che possono trattare i dati dei propri iscritti nell'ambito delle loro attività legittime, a condizione che il trattamento riguardi solo iscritti, ex iscritti o chi ha contatti regolari con l'organizzazione e che i dati non vengano comunicati all'esterno senza consenso. È anche una buona ragione per tenere tutto in locale e non mandare nulla a un servizio esterno.

Ma ospitare un sistema in casa non lo rende lecito né sicuro: servono base giuridica, accessi controllati, cifratura e un parere legale prima di mettere dentro dati personali. Questo vademecum non è un parere legale.

## Dove si ferma

Non è un progetto di agente autonomo e non si addestra un modello di base da zero: non è la strada economica per un sindacato, e il libro di Raschka serve a capire come funziona, non a farlo. Un assistente che risponde dai contratti non sostituisce la delegata che li conosce. L'ambizione più grande è un commons federato: sezioni e sindacati diversi condividono software aperto, metodi di valutazione e materiali non riservati, e ognuno tiene per sé i documenti sensibili. Così l'indipendenza tecnica costa meno e regge meglio.

Tutte le fonti citate sono nella [Biblioteca](/biblioteca/), con la licenza di ciascuna.
