import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Alias di tipo e non interfaccia, di proposito: TypeScript concede una index
 * signature implicita solo agli alias, e senza quella questo oggetto non
 * verrebbe accettato da cancelloPagamenti(), che legge le variabili per nome.
 */
export type RuntimeEnv = {
  /**
   * Interruttore dei pagamenti (Fase 5). Solo la stringa esatta "true" li apre:
   * assente, vuota o qualsiasi altro valore li tiene chiusi. Opzionale di
   * proposito — un ambiente che non la definisce e' un ambiente con i pagamenti
   * fermi, che e' lo stato corretto oggi. Vedi src/lib/pagamenti.ts.
   */
  PAGAMENTI_ATTIVI?: string;
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_STUDENTE: string;
  STRIPE_PRICE_COGNITARIO: string;
  STRIPE_PRICE_SOSTENITORE: string;
  STRIPE_PRICE_MERCH_TSHIRT: string;
  STRIPE_PRICE_MERCH_PIN: string;
  STRIPE_PRICE_MERCH_POSTER: string;
  SITE_URL: string;
};

/** Client con la sola anon key: usato per validare il JWT di un utente lato server. Non bypassa mai RLS. */
export function getSupabaseAnon(env: RuntimeEnv): SupabaseClient {
  return createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Client con la service role key: bypassa RLS. Usare SOLO nel webhook Stripe e nella
 * cancellazione account — mai per servire richieste non verificate lato client.
 */
export function getSupabaseAdmin(env: RuntimeEnv): SupabaseClient {
  return createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Estrae e valida il JWT dall'header Authorization, restituendo l'utente Supabase autenticato. */
export async function requireUser(env: RuntimeEnv, request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const supabase = getSupabaseAnon(env);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
