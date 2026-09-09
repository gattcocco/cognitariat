/**
 * Controlla la configurazione di Supabase Auth dal lato di chi la userebbe per
 * abusarne: dall'esterno, con la sola chiave pubblica.
 *
 * Perche' serve. Il modulo di iscrizione e' stato rimosso in Fase 4, ma togliere
 * il modulo non chiude niente: PUBLIC_SUPABASE_URL e la anon key sono pubbliche
 * per costruzione, e l'endpoint Auth risponde a chiunque le usi. Se il progetto
 * accetta registrazioni e non pretende un captcha, chiunque puo' creare utenti a
 * raffica chiamando l'API direttamente, senza mai passare dal nostro sito.
 *
 * Cosa fa, e cosa non fa:
 *   - legge GET /auth/v1/settings, che e' pubblico e di sola lettura;
 *   - manda UNA richiesta di magic link con un indirizzo volutamente NON valido
 *     ("non-un-indirizzo"). Serve a distinguere due risposte diverse:
 *       * errore di captcha  -> il captcha e' preteso prima di tutto: buono;
 *       * errore di formato  -> nessun captcha: la richiesta e' arrivata alla
 *                               validazione dell'indirizzo, quindi una richiesta
 *                               ben formata sarebbe passata.
 *     L'indirizzo e' invalido apposta: in nessuno dei due casi parte un'email e
 *     in nessuno dei due casi viene creato un utente.
 *
 * Non crea account, non invia messaggi, non modifica nessuna impostazione.
 *
 * Uso:
 *   PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
 *   PUBLIC_SUPABASE_ANON_KEY=eyJ... \
 *   node scripts/verifica-supabase.mjs
 *
 * I valori sono quelli veri del progetto (Supabase -> Project Settings -> API).
 * Il .dev.vars del repository contiene segnaposto: con quelli lo script si ferma,
 * perche' non potrebbe dire niente di vero.
 */

const url = (process.env.PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

function esci(messaggio, codice = 1) {
  console.error(messaggio);
  process.exit(codice);
}

if (!url || !key) {
  esci(
    "Servono PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY nell'ambiente.\n" +
      "Vedi l'intestazione di questo file per il comando completo."
  );
}
if (/placeholder|esempio|xxxx/i.test(url) || /placeholder|esempio/i.test(key)) {
  esci(
    "I valori passati sono segnaposto, non le credenziali vere del progetto.\n" +
      "Con questi non si puo' verificare niente: prendi URL e anon key dal pannello Supabase."
  );
}

const intestazioni = {
  apikey: key,
  authorization: `Bearer ${key}`,
  "content-type": "application/json",
};
const esiti = [];

// --- 1. Impostazioni pubbliche ------------------------------------------------
let settings;
try {
  const r = await fetch(`${url}/auth/v1/settings`, { headers: intestazioni });
  if (!r.ok) esci(`GET /auth/v1/settings ha risposto ${r.status}. URL o chiave sbagliati?`);
  settings = await r.json();
} catch (e) {
  esci(`Non riesco a contattare ${url}: ${e.message}`);
}

const registrazioniAperte = settings.disable_signup === false;
const confermaSaltata = settings.mailer_autoconfirm === true;
const provider = Object.entries(settings.external ?? {})
  .filter(([, attivo]) => attivo)
  .map(([nome]) => nome);

console.log("IMPOSTAZIONI PUBBLICHE (GET /auth/v1/settings)");
console.log(`  registrazioni via API      ${registrazioniAperte ? "APERTE" : "chiuse (disable_signup=true)"}`);
console.log(`  conferma email             ${confermaSaltata ? "SALTATA (mailer_autoconfirm=true)" : "richiesta"}`);
console.log(`  provider esterni attivi    ${provider.length ? provider.join(", ") : "nessuno"}`);

if (registrazioniAperte) {
  esiti.push(
    "Le registrazioni via API sono aperte: senza modulo sul sito restano comunque\n" +
      "     creabili chiamando direttamente l'endpoint Auth. Per un lancio a iscrizioni\n" +
      "     chiuse la scelta coerente e' disattivarle in Supabase -> Authentication ->\n" +
      "     Sign In / Providers -> «Allow new users to sign up»."
  );
}
if (confermaSaltata) {
  esiti.push(
    "mailer_autoconfirm e' attivo: gli utenti risultano confermati senza cliccare\n" +
      "     niente, e il trigger sulla conferma scatta subito per chiunque."
  );
}

// --- 2. Il captcha e' preteso prima della validazione? ------------------------
console.log("\nCAPTCHA (una richiesta con indirizzo volutamente non valido)");
let rispostaOtp;
try {
  const r = await fetch(`${url}/auth/v1/otp`, {
    method: "POST",
    headers: intestazioni,
    // Indirizzo non valido apposta: nessuna email puo' partire, nessun utente
    // puo' nascere. Interessa solo QUALE errore torna.
    body: JSON.stringify({ email: "non-un-indirizzo", create_user: false }),
  });
  rispostaOtp = { stato: r.status, corpo: await r.text() };
} catch (e) {
  esci(`Richiesta a /auth/v1/otp fallita: ${e.message}`);
}

const testo = rispostaOtp.corpo.toLowerCase();
const parlaDiCaptcha = /captcha/.test(testo);
const parlaDiIndirizzo = /email|address|invalid/.test(testo) && !parlaDiCaptcha;

console.log(`  risposta                  ${rispostaOtp.stato} ${rispostaOtp.corpo.slice(0, 140)}`);
if (parlaDiCaptcha) {
  console.log("  lettura                   captcha preteso prima della validazione: buono.");
} else if (parlaDiIndirizzo) {
  console.log("  lettura                   nessun captcha: si e' arrivati alla validazione dell'indirizzo.");
  esiti.push(
    "Nessun captcha davanti all'endpoint Auth. Il widget nel modulo non conta: il\n" +
      "     confine deve stare in Supabase -> Authentication -> Bot and Abuse Protection\n" +
      "     (Enable Captcha protection, provider Turnstile, secret key di Cloudflare)."
  );
} else {
  console.log("  lettura                   risposta non riconosciuta: da guardare a mano.");
  esiti.push("La risposta di /auth/v1/otp non parla ne' di captcha ne' di formato: verificare a mano.");
}

// --- Esito --------------------------------------------------------------------
console.log("\n" + "-".repeat(72));
if (esiti.length === 0) {
  console.log("Nessun problema rilevato: registrazioni chiuse e captcha preteso.");
  process.exit(0);
}
console.log(`${esiti.length} punto/i da sistemare:\n`);
esiti.forEach((e, i) => console.log(`  ${i + 1}.  ${e}\n`));
console.log(
  "Nessuna di queste modifiche va fatta al buio. Prima di chiudere le registrazioni,\n" +
    "controllare se esistono gia' utenti confermati che perderebbero l'accesso:\n" +
    "  select count(*) from auth.users where email_confirmed_at is not null;"
);
process.exit(1);
