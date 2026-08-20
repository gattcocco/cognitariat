import { requireUser, getSupabaseAdmin, type RuntimeEnv } from '../../src/lib/supabase-server';
import { getStripe } from '../../src/lib/stripe';

// PROVVISORIO: cancella l'abbonamento Stripe e rimuove profilo/membership/utente Supabase.
// Il piano (§6, retention matrix) segnala che questo comportamento va confermato con chi
// segue la contabilità del cliente — potrebbe servire anonimizzare invece di cancellare
// del tutto, se alcuni riferimenti servono per la tracciabilità fiscale. Non trattare
// questa implementazione come definitiva finché la retention matrix non è definita.
export const onRequestPost: PagesFunction<RuntimeEnv> = async (context) => {
  const { request, env } = context;

  const user = await requireUser(env, request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autenticato.' }), { status: 401 });
  }

  const admin = getSupabaseAdmin(env);
  const { data: membership } = await admin
    .from('memberships')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .single();

  if (membership?.stripe_subscription_id) {
    const stripe = getStripe(env);
    try {
      await stripe.subscriptions.cancel(membership.stripe_subscription_id);
    } catch {
      // Se l'abbonamento è già cancellato/inesistente su Stripe, procediamo comunque
      // con la cancellazione dei dati locali: non deve bloccare il diritto alla cancellazione.
    }
  }

  await admin.from('memberships').delete().eq('user_id', user.id);
  await admin.from('member_profiles').delete().eq('id', user.id);
  await admin.auth.admin.deleteUser(user.id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
