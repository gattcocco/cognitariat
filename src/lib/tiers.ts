// Client-safe: nessuna dipendenza server (a differenza di lib/stripe.ts, che importa l'SDK Stripe
// e non va mai importato da codice eseguito nel browser).
//
// Quote associative 2026 (Build 1.0): pagamento one-off, non abbonamento — vedi piano v3.
export type MembershipTier = 'studente' | 'cognitario';

export const TIER_LABELS: Record<MembershipTier, string> = {
  studente: 'Studentə / disoccupatə',
  cognitario: 'Cognitariə',
};

export const TIER_PRICES_EUR: Record<MembershipTier, number> = {
  studente: 10,
  cognitario: 20,
};

export function isMembershipTier(value: string): value is MembershipTier {
  return value === 'studente' || value === 'cognitario';
}
