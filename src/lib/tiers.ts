// Client-safe: nessuna dipendenza server (a differenza di lib/stripe.ts, che importa l'SDK Stripe
// e non va mai importato da codice eseguito nel browser).
export type MembershipTier = 'solidarieta' | 'precaria' | 'stabile';

export const TIER_LABELS: Record<MembershipTier, string> = {
  solidarieta: 'Solidarietà',
  precaria: 'Precariə',
  stabile: 'Stabile',
};

export function isMembershipTier(value: string): value is MembershipTier {
  return value === 'solidarieta' || value === 'precaria' || value === 'stabile';
}
