import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
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

/** Lancia se la query Supabase è fallita: nessun upsert deve poter fallire in silenzio dentro il webhook. */
function assertOk<T>({ error }: { data: T; error: { message: string } | null }): void {
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}

// Unico punto che marca un utente come iscritto pagante: non fidarsi mai del redirect
// di ritorno dal browser dopo Stripe Checkout, solo di questo webhook firmato.
//
// Idempotente e a prova di fallimento parziale: stripe_events.status passa da
// 'processing' a 'processed' SOLO se l'intero handler completa senza errori. Se una
// scrittura Supabase fallisce a metà, l'evento resta 'processing'/'failed' (mai
// 'processed'), quindi un retry di Stripe rielabora l'evento da capo invece di trovare
// una riga già "vista" e rispondere 200 senza aver applicato l'aggiornamento.
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

  const { data: existingEvent, error: lookupError } = await admin
    .from('stripe_events')
    .select('status')
    .eq('event_id', event.id)
    .maybeSingle();

  if (lookupError) {
    // DB non raggiungibile: rispondere errore così Stripe riprova più tardi.
    return new Response('Could not check event status', { status: 500 });
  }

  if (existingEvent?.status === 'processed') {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  // Prima consegna di questo event_id, oppure un retry di un evento rimasto 'processing'/
  // 'failed' (mai arrivato a 'processed'): in entrambi i casi va (ri)elaborato.
  assertOk(
    await admin
      .from('stripe_events')
      .upsert({ event_id: event.id, event_type: event.type, status: 'processing' }, { onConflict: 'event_id' })
  );

  try {
    await handleEvent(admin, stripe, event);

    assertOk(
      await admin
        .from('stripe_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('event_id', event.id)
    );

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    // Best-effort: se anche questo update fallisce, l'evento resta 'processing' e verrà
    // comunque rielaborato al prossimo retry (non finisce mai 'processed' per errore).
    await admin.from('stripe_events').update({ status: 'failed' }).eq('event_id', event.id);
    return new Response('Webhook handler failed', { status: 500 });
  }
};

async function handleEvent(admin: SupabaseClient, stripe: Stripe, event: Stripe.Event): Promise<void> {
  async function upsertFromSubscription(subscription: Stripe.Subscription, statusOverride?: MembershipStatus) {
    const userId = subscription.metadata?.supabase_user_id;
    const tier = subscription.metadata?.tier;
    if (!userId || !tier || !isMembershipTier(tier)) return;

    assertOk(
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
      )
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || !session.subscription) return; // merch (mode: 'payment'): niente da fare qui

      const userId = session.metadata?.supabase_user_id;
      const tier = session.metadata?.tier;
      if (!userId || !tier || !isMembershipTier(tier)) return;

      // Non sovrascrivere uno stato più avanzato se invoice.paid è già arrivato prima
      // (ordine non garantito): aggiorniamo qui solo se la riga è ancora 'pending'.
      const { data: existing, error: selectError } = await admin
        .from('memberships')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      if (selectError) throw new Error(`Supabase read failed: ${selectError.message}`);

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

      assertOk(
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
        )
      );
      return;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) return;
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await upsertFromSubscription(subscription, 'active');
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) return;
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await upsertFromSubscription(subscription, 'past_due');
      return;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertFromSubscription(subscription);
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertFromSubscription(subscription, 'canceled');
      return;
    }
  }
}
