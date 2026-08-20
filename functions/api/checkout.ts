import { requireUser, getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe, priceIdForTier, isMembershipTier } from '../../src/lib/stripe';

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

  // Riga "pending" creata subito, prima del redirect a Stripe: il webhook (idempotente,
  // vedi functions/webhooks/stripe.ts) la porterà a payment_pending/active in modo
  // order-independent, senza doverla creare lui stesso da zero.
  const admin = getSupabaseAdmin(env);
  await admin
    .from('memberships')
    .upsert({ user_id: user.id, tier, status: 'pending' }, { onConflict: 'user_id' });

  const stripe = getStripe(env);
  const priceId = priceIdForTier(env, tier);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, tier },
    subscription_data: { metadata: { supabase_user_id: user.id, tier } },
    success_url: `${env.SITE_URL}/account?checkout=success`,
    cancel_url: `${env.SITE_URL}/#membership`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
