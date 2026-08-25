import type Stripe from 'stripe';
import { requireUser, getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe, priceIdForTier, isMembershipTier } from '../../src/lib/stripe';

// Quota associativa 2026 (Build 1.0): pagamento ONE-OFF, nessun rinnovo automatico,
// valida fino al 31/12/2026 — non un abbonamento. Vedi piano v3.
const VALID_UNTIL_2026 = '2026-12-31';

export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { request, env } = context;

  const user = await requireUser(env, request);
  if (!user || !user.email) {
    return new Response(JSON.stringify({ error: 'Devi accedere prima di scegliere una fascia.' }), { status: 401 });
  }

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Richiesta non valida.' }), { status: 400 });
  }

  if (!body.tier || !isMembershipTier(body.tier)) {
    return new Response(JSON.stringify({ error: 'Fascia di iscrizione non valida.' }), { status: 400 });
  }
  const tier = body.tier;

  const admin = getSupabaseAdmin(env);
  const { data: existing, error: selectError } = await admin
    .from('memberships')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (selectError) {
    return new Response(JSON.stringify({ error: 'Errore nel controllare la quota esistente.' }), { status: 500 });
  }

  // Un doppio click/retry/nuova visita non deve poter far pagare due volte la stessa
  // persona: se ha già una quota 2026 attiva o un pagamento in corso di conferma
  // (metodo asincrono tipo SEPA), non se ne avvia un altro.
  if (existing && (existing.status === 'active' || existing.status === 'payment_pending')) {
    return new Response(
      JSON.stringify({ error: 'Hai già una quota 2026 attiva o in attesa di conferma. Controlla la tua area membro.' }),
      { status: 409 }
    );
  }

  const { error: upsertError } = await admin
    .from('memberships')
    .upsert({ user_id: user.id, tier, status: 'pending' }, { onConflict: 'user_id' });
  if (upsertError) {
    return new Response(JSON.stringify({ error: 'Errore nel preparare l\'iscrizione.' }), { status: 500 });
  }

  const stripe = getStripe(env);
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
    success_url: `${env.SITE_URL}/account?checkout=success`,
    cancel_url: `${env.SITE_URL}/#membership`,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
