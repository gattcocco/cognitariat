import Stripe from 'stripe';
import type { RuntimeEnv } from './supabase-server';
import { type MembershipTier, isMembershipTier } from './tiers';

export type { MembershipTier };
export { isMembershipTier };

export function getStripe(env: RuntimeEnv): Stripe {
  // Cloudflare Workers non ha i moduli Node (http/crypto): serve l'httpClient basato su fetch
  // e le chiamate webhook devono usare le varianti *Async (vedi api/webhooks/stripe.ts).
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function priceIdForTier(env: RuntimeEnv, tier: MembershipTier): string {
  const map: Record<MembershipTier, string> = {
    studente: env.STRIPE_PRICE_STUDENTE,
    cognitario: env.STRIPE_PRICE_COGNITARIO,
  };
  return map[tier];
}

export type MerchItem = 't-shirt' | 'pin' | 'poster';

export function isMerchItem(value: string): value is MerchItem {
  return value === 't-shirt' || value === 'pin' || value === 'poster';
}

export function priceIdForMerchItem(env: RuntimeEnv, item: MerchItem): string {
  const map: Record<MerchItem, string> = {
    't-shirt': env.STRIPE_PRICE_MERCH_TSHIRT,
    pin: env.STRIPE_PRICE_MERCH_PIN,
    poster: env.STRIPE_PRICE_MERCH_POSTER,
  };
  return map[item];
}
