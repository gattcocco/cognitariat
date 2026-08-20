import type Stripe from 'stripe';
import { getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe, isMembershipTier } from '../../src/lib/stripe';

type MembershipStatus = 'pending' | 'payment_pending' | 'active' | 'past_due' | 'canceled' | 'expired';

function mapStripeStatus(status: Stripe.Subscription.Status): MembershipStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete_expired':
      return 'expired';
    default:
      return 'payment_pending';
  }
}

function periodEndDate(subscription: Stripe.Subscription): string {
  return new Date(subscription.current_period_end * 1000).toISOString().slice(0, 10);
}

// Unico punto che marca un utente come iscritto pagante: non fidarsi mai del redirect
// di ritorno dal browser dopo Stripe Checkout, solo di questo webhook firmato.
//
// Idempotente (Stripe può consegnare lo stesso evento più volte) e order-independent
// (Stripe non garantisce l'ordine di consegna: invoice.paid può arrivare prima di
// checkout.session.completed). Ogni handler recupera da sé i dati che gli servono invece
// di assumere che un evento precedente sia già passato.
export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { request, env } = context;
  const stripe = getStripe(env);
  const admin = getSupabaseAdmin(env);

  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // constructEventAsync: Cloudflare Workers non ha l'API sync di Node per l'HMAC.
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const { error: dupeError } = await admin
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: event.type });

  if (dupeError) {
    // 23505 = unique_violation: evento già processato, non rifare nulla.
    if (dupeError.code === '23505') {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
    // Errore diverso (es. DB temporaneamente non raggiungibile): rispondere errore così
    // Stripe riprova più tardi, invece di processare senza garanzia di idempotenza.
    return new Response('Could not record event', { status: 500 });
  }

  async function upsertFromSubscription(subscription: Stripe.Subscription, statusOverride?: MembershipStatus) {
    const userId = subscription.metadata?.supabase_user_id;
    const tier = subscription.metadata?.tier;
    if (!userId || !tier || !isMembershipTier(tier)) return;

    await admin.from('memberships').upsert(
      {
        user_id: userId,
        tier,
        status: statusOverride ?? mapStripeStatus(subscription.status),
        current_period_end: periodEndDate(subscription),
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
      },
      { onConflict: 'user_id' }
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || !session.subscription) break; // merch (mode: 'payment'): niente da fare qui

      const userId = session.metadata?.supabase_user_id;
      const tier = session.metadata?.tier;
      if (!userId || !tier || !isMembershipTier(tier)) break;

      // Non sovrascrivere uno stato più avanzato se invoice.paid è già arrivato prima
      // (ordine non garantito): aggiorniamo qui solo se la riga è ancora 'pending'.
      const { data: existing } = await admin
        .from('memberships')
        .select('status')
        .eq('user_id', userId)
        .single();

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

      await admin.from('memberships').upsert(
        {
          user_id: userId,
          tier,
          status: !existing || existing.status === 'pending' ? 'payment_pending' : existing.status,
          current_period_end: periodEndDate(subscription),
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        },
        { onConflict: 'user_id' }
      );
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) break;
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await upsertFromSubscription(subscription, 'active');
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) break;
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await upsertFromSubscription(subscription, 'past_due');
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertFromSubscription(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertFromSubscription(subscription, 'canceled');
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
