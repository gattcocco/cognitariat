import type { RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe, priceIdForMerchItem, isMerchItem } from '../../src/lib/stripe';

// Fase 2: acquisto merch, one-off, nessun account richiesto (mode: 'payment').
export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { request, env } = context;

  let body: { item?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Richiesta non valida.' }), { status: 400 });
  }

  if (!body.item || !isMerchItem(body.item)) {
    return new Response(JSON.stringify({ error: 'Articolo non valido.' }), { status: 400 });
  }

  const stripe = getStripe(env);
  const priceId = priceIdForMerchItem(env, body.item);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    shipping_address_collection: {
      allowed_countries: ['IT', 'FR', 'DE', 'ES', 'AT', 'NL', 'BE', 'PT', 'IE'],
    },
    metadata: { item: body.item },
    success_url: `${env.SITE_URL}/?merch=success#merch`,
    cancel_url: `${env.SITE_URL}/#merch`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
