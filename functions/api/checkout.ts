import type Stripe from 'stripe';
import { requireUser, getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe, priceIdForTier, isMembershipTier } from '../../src/lib/stripe';
import { cancelloPagamenti, CHIAVI_QUOTA } from '../../src/lib/pagamenti';

// Quota associativa 2026 (Build 1.0): pagamento ONE-OFF, nessun rinnovo automatico,
// valida fino al 31/12/2026 — non un abbonamento. Vedi piano v3.
const VALID_UNTIL_2026 = '2026-12-31';

// 30 minuti: il minimo consentito da Stripe per expires_at. Il lease della prenotazione
// lato database è volutamente PIÙ LUNGO (35 min, vedi 0006_claim_membership_checkout.sql),
// perché la prenotazione nasce prima della sessione: così è sempre la sessione Stripe a
// scadere per prima, e il rinnovo della prenotazione avviene solo dopo aver verificato
// qui sotto lo stato reale della sessione.
const SESSION_TTL_SECONDS = 30 * 60;

// Il ciclo può ripartire quando un'altra richiesta concorrente vince la prenotazione:
// poche iterazioni bastano, il limite serve solo a non girare all'infinito.
const MAX_CLAIM_ATTEMPTS = 3;

interface ClaimResult {
  outcome: 'claimed' | 'reuse' | 'in_progress' | 'blocked';
  session_id: string | null;
  current_status: string | null;
  current_tier: string | null;
  claim_token: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const BLOCKED_MESSAGES: Record<string, string> = {
  active: 'Hai già una quota 2026 attiva. Controlla la tua area membro.',
  payment_pending: 'Il tuo pagamento è in corso di conferma. Controlla la tua area membro tra poco.',
  rejected: 'La tua iscrizione non è stata accettata. Scrivici a cognitariatz@proton.me per maggiori informazioni.',
};

const RETRY_MESSAGE = 'Stiamo già preparando il tuo pagamento. Attendi qualche secondo e riprova.';

export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { request, env } = context;

  // PRIMA di tutto il resto: prima di leggere il corpo, prima di validare il
  // token (che e' gia' una chiamata verso Supabase), prima di costruire il
  // client Stripe, prima di qualunque scrittura. Se i pagamenti sono fermi,
  // questa richiesta non deve lasciare traccia da nessuna parte.
  const cancello = cancelloPagamenti(env, CHIAVI_QUOTA);
  if (cancello.bloccato) return cancello.risposta;

  const user = await requireUser(env, request);
  if (!user || !user.email) {
    return json({ error: 'Devi accedere prima di scegliere una fascia.' }, 401);
  }

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Richiesta non valida.' }, 400);
  }

  if (!body.tier || !isMembershipTier(body.tier)) {
    return json({ error: 'Fascia di iscrizione non valida.' }, 400);
  }
  const tier = body.tier;

  const admin = getSupabaseAdmin(env);
  const stripe = getStripe(env);

  /**
   * Prenota il checkout. `expectedToken` va passato solo per SOSTITUIRE una prenotazione
   * di cui si è appena verificata su Stripe la sessione: è il compare-and-swap che
   * impedisce a due richieste concorrenti di rinnovare entrambe.
   */
  async function claim(expectedToken: string | null): Promise<ClaimResult | null> {
    const { data, error } = await admin
      .rpc('claim_membership_checkout', {
        p_user_id: user!.id,
        p_tier: tier,
        p_expected_claim_token: expectedToken,
      })
      .single();
    if (error) return null;
    return data as ClaimResult;
  }

  async function createSessionFor(claimToken: string): Promise<Response> {
    const priceId = priceIdForTier(env, tier);

    // Nota: il codice fiscale (member_profiles.codice_fiscale) non viene letto né inviato
    // qui di proposito — non deve mai raggiungere Stripe, salvo necessità verificata in
    // seguito (vedi piano v3).
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user!.email,
      client_reference_id: user!.id,
      metadata: { supabase_user_id: user!.id, tier, valid_until: VALID_UNTIL_2026 },
      payment_intent_data: { metadata: { supabase_user_id: user!.id, tier } },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      success_url: `${env.SITE_URL}/account?checkout=success`,
      cancel_url: `${env.SITE_URL}/#membership`,
    };

    let session: Stripe.Checkout.Session;
    try {
      // Idempotency key legata al token della prenotazione: un retry della stessa
      // richiesta (rete instabile, client che ritenta) restituisce la sessione già creata
      // invece di crearne una seconda. Il token cambia ad ogni nuova prenotazione, quindi
      // un ritentativo legittimo dopo la scadenza ottiene comunque una sessione nuova.
      session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: `cogu-2026-${user!.id}-${tier}-${claimToken}`,
      });
    } catch {
      return json({ error: 'Non siamo riusciti ad avviare il pagamento. Riprova tra poco.' }, 502);
    }

    // Salvataggio condizionato al token: se nel frattempo un'altra richiesta ha vinto una
    // nuova prenotazione, questa update non tocca nulla invece di sovrascrivere la
    // sessione più recente con una più vecchia. Non è bloccante: il pagamento resta
    // valido comunque e il webhook riconcilia tramite metadata.supabase_user_id.
    await admin
      .from('memberships')
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('user_id', user!.id)
      .eq('checkout_claim_token', claimToken);

    return json({ url: session.url }, 200);
  }

  let claimResult = await claim(null);

  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    if (!claimResult) {
      return json({ error: 'Errore nel preparare l\'iscrizione.' }, 500);
    }

    if (claimResult.outcome === 'blocked') {
      return json(
        {
          error:
            BLOCKED_MESSAGES[claimResult.current_status ?? ''] ??
            'Non è possibile avviare un nuovo pagamento adesso.',
        },
        409
      );
    }

    if (claimResult.outcome === 'in_progress') {
      return json({ error: RETRY_MESSAGE }, 409);
    }

    if (claimResult.outcome === 'claimed') {
      return createSessionFor(claimResult.claim_token);
    }

    // outcome === 'reuse': esiste una prenotazione viva con una sessione. Si decide in
    // base allo stato REALE della sessione su Stripe, non in base al solo tempo trascorso.
    const previousToken = claimResult.claim_token;
    const sessionId = claimResult.session_id;
    if (!sessionId) {
      // Difensivo: 'reuse' arriva sempre con una sessione. Si tenta la sostituzione.
      claimResult = await claim(previousToken);
      continue;
    }

    let existingSession: Stripe.Checkout.Session | null = null;
    try {
      existingSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      // Sessione non recuperabile (es. cancellata su Stripe): si sostituisce.
      claimResult = await claim(previousToken);
      continue;
    }

    if (existingSession.status === 'complete') {
      return json({ error: 'Il pagamento risulta già completato. Controlla la tua area membro.' }, 409);
    }

    if (existingSession.status === 'open') {
      if (claimResult.current_tier === tier && existingSession.url) {
        // Stessa fascia e sessione ancora valida: si riusa, niente seconda sessione.
        return json({ url: existingSession.url }, 200);
      }
      // Sessione aperta ma per un'altra fascia: va chiusa, altrimenti resterebbe pagabile
      // con l'importo sbagliato.
      try {
        await stripe.checkout.sessions.expire(sessionId);
      } catch {
        // Se non si riesce a chiuderla, meglio non aprirne una seconda in parallelo.
        return json({ error: RETRY_MESSAGE }, 409);
      }
    }

    // Sessione scaduta, o appena chiusa perché di un'altra fascia: si prova a sostituire
    // la prenotazione presentando il token verificato. Se un'altra richiesta ha già
    // rinnovato, il token non combacia e il giro successivo troverà la prenotazione nuova.
    claimResult = await claim(previousToken);
  }

  return json({ error: RETRY_MESSAGE }, 409);
};
