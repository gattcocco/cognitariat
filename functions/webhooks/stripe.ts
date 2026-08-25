import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe, isMembershipTier } from '../../src/lib/stripe';

type MembershipStatus = 'pending' | 'payment_pending' | 'active' | 'payment_failed';

/** Lancia se la query Supabase è fallita: nessuna scrittura può poter fallire in silenzio dentro il webhook. */
function assertOk<T>({ error }: { data: T; error: { message: string } | null }): void {
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}

// Unico punto che marca un utente come iscritto pagante: non fidarsi mai del redirect
// di ritorno dal browser dopo Stripe Checkout, solo di questo webhook firmato.
//
// Pagamento ONE-OFF (Build 1.0, piano v3), non abbonamento: checkout.session.completed è
// il segnale principale, ma per i metodi di pagamento asincroni (es. SEPA) il pagamento
// può restare "in corso" anche a sessione completata — session.payment_status distingue
// i due casi. async_payment_succeeded/async_payment_failed arrivano poi per gli stessi.
//
// Idempotente e a prova di fallimento parziale: stripe_events.status passa da
// 'processing' a 'processed' SOLO se l'intero handler completa senza errori.
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
    return new Response('Could not check event status', { status: 500 });
  }

  if (existingEvent?.status === 'processed') {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  assertOk(
    await admin
      .from('stripe_events')
      .upsert({ event_id: event.id, event_type: event.type, status: 'processing' }, { onConflict: 'event_id' })
  );

  try {
    await handleEvent(admin, event);

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
  } catch {
    await admin.from('stripe_events').update({ status: 'failed' }).eq('event_id', event.id);
    return new Response('Webhook handler failed', { status: 500 });
  }
};

async function handleEvent(admin: SupabaseClient, event: Stripe.Event): Promise<void> {
  async function upsertFromSession(session: Stripe.Checkout.Session, status: MembershipStatus) {
    const userId = session.metadata?.supabase_user_id;
    const tier = session.metadata?.tier;
    const validUntil = session.metadata?.valid_until;
    if (!userId || !tier || !isMembershipTier(tier)) return;

    // Non retrocedere uno stato già 'active' (es. un evento arrivato in ritardo/duplicato
    // per una sessione già confermata da un evento precedente).
    const { data: existing, error: selectError } = await admin
      .from('memberships')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (selectError) throw new Error(`Supabase read failed: ${selectError.message}`);
    if (existing?.status === 'active' && status !== 'active') return;

    assertOk(
      await admin.from('memberships').upsert(
        {
          user_id: userId,
          tier,
          status,
          amount_paid_cents: session.amount_total ?? null,
          stripe_customer_id: (session.customer as string) ?? null,
          stripe_checkout_session_id: session.id,
          valid_until: status === 'active' ? validUntil ?? null : null,
        },
        { onConflict: 'user_id' }
      )
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'payment' || !session.metadata?.tier) return; // merch/sostenitore: niente da fare qui

      // payment_status 'paid' = confermato subito (carta). 'unpaid' con metodo asincrono
      // (es. SEPA) = addebito avviato ma non ancora incassato: si aspetta async_payment_*.
      await upsertFromSession(session, session.payment_status === 'paid' ? 'active' : 'payment_pending');
      return;
    }

    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.metadata?.tier) return;
      await upsertFromSession(session, 'active');
      return;
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.metadata?.tier) return;
      await upsertFromSession(session, 'payment_failed');
      return;
    }
  }
}
