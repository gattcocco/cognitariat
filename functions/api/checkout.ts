import type Stripe from 'stripe';
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

  const admin = getSupabaseAdmin(env);
  const { data: existing, error: selectError } = await admin
    .from('memberships')
    .select('status, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (selectError) {
    return new Response(JSON.stringify({ error: 'Errore nel controllare l\'iscrizione esistente.' }), { status: 500 });
  }

  // Un doppio click/retry/nuova visita non deve poter creare una seconda subscription
  // Stripe per la stessa persona: se ne ha già una attiva o in attesa di conferma di
  // pagamento, non se ne crea un'altra — la gestisce dall'area membro/Customer Portal.
  if (existing && (existing.status === 'active' || existing.status === 'payment_pending')) {
    return new Response(
      JSON.stringify({ error: 'Hai già un\'iscrizione attiva o in attesa di conferma. Gestiscila dalla tua area membro.' }),
      { status: 409 }
    );
  }

  // Riga "pending" creata/aggiornata subito, prima del redirect a Stripe: il webhook
  // (idempotente, vedi functions/webhooks/stripe.ts) la porterà a payment_pending/active
  // in modo order-independent, senza doverla creare lui stesso da zero.
  const { error: upsertError } = await admin
    .from('memberships')
    .upsert(
      { user_id: user.id, tier, status: 'pending', stripe_customer_id: existing?.stripe_customer_id ?? null },
      { onConflict: 'user_id' }
    );
  if (upsertError) {
    return new Response(JSON.stringify({ error: 'Errore nel preparare l\'iscrizione.' }), { status: 500 });
  }

  const stripe = getStripe(env);
  const priceId = priceIdForTier(env, tier);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, tier },
    subscription_data: { metadata: { supabase_user_id: user.id, tier } },
    success_url: `${env.SITE_URL}/account?checkout=success`,
    cancel_url: `${env.SITE_URL}/#membership`,
  };

  // Riusa il Customer Stripe esistente (da un tentativo precedente) invece di lasciarne
  // creare uno nuovo ad ogni checkout: evita Customer duplicati per la stessa persona.
  if (existing?.stripe_customer_id) {
    sessionParams.customer = existing.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
