import type { RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe } from '../../src/lib/stripe';

// Contributo sostenitore: €50+ a importo libero, SENZA iscrizione — pagamento anonimo
// puro come il merch. Nessun login richiesto, nessuna riga scritta nel nostro DB: il
// tracciamento resta interamente su Stripe (STRIPE_PRICE_SOSTENITORE è una Price con
// custom_unit_amount abilitato e minimo 5000 centesimi, configurata su Stripe Dashboard).
export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { env } = context;
  const stripe = getStripe(env);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: env.STRIPE_PRICE_SOSTENITORE, quantity: 1 }],
    success_url: `${env.SITE_URL}/?sostegno=grazie#membership`,
    cancel_url: `${env.SITE_URL}/#membership`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
