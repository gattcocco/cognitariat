import type Stripe from 'stripe';
import { requireUser, getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe, priceIdForTier, isMembershipTier } from '../../src/lib/stripe';

// Quota associativa 2026 (Build 1.0): pagamento ONE-OFF, nessun rinnovo automatico,
// valida fino al 31/12/2026 — non un abbonamento. Vedi piano v3.
const VALID_UNTIL_2026 = '2026-12-31';

// Minimo consentito da Stripe per expires_at, e stessa durata del lease di prenotazione
// in claim_membership_checkout (0006): sessione scaduta e prenotazione scaduta coincidono.
const SESSION_TTL_SECONDS = 30 * 60;

interface ClaimResult {
  outcome: 'claimed' | 'reuse' | 'in_progress' | 'blocked';
  session_id: string | null;
  current_status: string | null;
  claimed_at: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { request, env } = context;

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

  async function claim(force: boolean): Promise<ClaimResult | null> {
    const { data, error } = await admin
      .rpc('claim_membership_checkout', { p_user_id: user!.id, p_tier: tier, p_force: force })
      .single();
    if (error) return null;
    return data as ClaimResult;
  }

  // Prenotazione atomica: due richieste concorrenti non possono entrambe creare una
  // sessione. La decisione è presa dentro una transazione con la riga bloccata
  // (vedi supabase/migrations/0006_claim_membership_checkout.sql).
  let claimResult = await claim(false);
  if (!claimResult) {
    return json({ error: 'Errore nel preparare l\'iscrizione.' }, 500);
  }

  if (claimResult.outcome === 'blocked') {
    const messages: Record<string, string> = {
      active: 'Hai già una quota 2026 attiva. Controlla la tua area membro.',
      payment_pending: 'Il tuo pagamento è in corso di conferma. Controlla la tua area membro tra poco.',
      rejected: 'La tua iscrizione non è stata accettata. Scrivici a cognitariatz@proton.me per maggiori informazioni.',
    };
    return json(
      { error: messages[claimResult.current_status ?? ''] ?? 'Non è possibile avviare un nuovo pagamento adesso.' },
      409
    );
  }

  if (claimResult.outcome === 'in_progress') {
    return json({ error: 'Stiamo già preparando il tuo pagamento. Attendi qualche secondo e riprova.' }, 409);
  }

  if (claimResult.outcome === 'reuse' && claimResult.session_id) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(claimResult.session_id);
      if (existingSession.status === 'open' && existingSession.url) {
        // Sessione ancora valida: si riusa invece di crearne una seconda.
        return json({ url: existingSession.url }, 200);
      }
      if (existingSession.status === 'complete') {
        return json({ error: 'Il pagamento risulta già completato. Controlla la tua area membro.' }, 409);
      }
      // Sessione scaduta: si forza una nuova prenotazione.
      claimResult = await claim(true);
      if (!claimResult || claimResult.outcome !== 'claimed') {
        return json({ error: 'Non è possibile avviare un nuovo pagamento adesso.' }, 409);
      }
    } catch {
      // La sessione non è recuperabile (es. cancellata su Stripe): si riparte da capo.
      claimResult = await claim(true);
      if (!claimResult || claimResult.outcome !== 'claimed') {
        return json({ error: 'Non è possibile avviare un nuovo pagamento adesso.' }, 409);
      }
    }
  }

  const priceId = priceIdForTier(env, tier);

  // Nota: il codice fiscale (member_profiles.codice_fiscale) non viene letto né inviato
  // qui di proposito — non deve mai raggiungere Stripe, salvo necessità verificata in
  // seguito (vedi piano v3).
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, tier, valid_until: VALID_UNTIL_2026 },
    payment_intent_data: { metadata: { supabase_user_id: user.id, tier } },
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    success_url: `${env.SITE_URL}/account?checkout=success`,
    cancel_url: `${env.SITE_URL}/#membership`,
  };

  let session: Stripe.Checkout.Session;
  try {
    // Idempotency key legata alla singola prenotazione: un retry della stessa richiesta
    // (rete instabile, client che ritenta) restituisce la sessione già creata invece di
    // crearne una seconda. Cambia ad ogni nuova prenotazione, così una quota ri-tentata
    // dopo la scadenza può legittimamente ottenere una sessione nuova.
    session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: `cogu-2026-${user.id}-${tier}-${claimResult.claimed_at}`,
    });
  } catch {
    return json({ error: 'Non siamo riusciti ad avviare il pagamento. Riprova tra poco.' }, 502);
  }

  // Salvataggio non bloccante: se fallisce, il pagamento resta comunque valido e il
  // webhook riconcilia la membership tramite metadata.supabase_user_id.
  await admin
    .from('memberships')
    .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  return json({ url: session.url }, 200);
};
