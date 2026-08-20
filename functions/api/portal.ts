import { requireUser, getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe } from '../../src/lib/stripe';

export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { request, env } = context;

  const user = await requireUser(env, request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autenticato.' }), { status: 401 });
  }

  const admin = getSupabaseAdmin(env);
  const { data: membership, error } = await admin
    .from('memberships')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (error || !membership?.stripe_customer_id) {
    return new Response(JSON.stringify({ error: 'Nessun abbonamento attivo trovato.' }), { status: 404 });
  }

  const stripe = getStripe(env);
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: membership.stripe_customer_id,
    return_url: `${env.SITE_URL}/account`,
  });

  return new Response(JSON.stringify({ url: portalSession.url }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
