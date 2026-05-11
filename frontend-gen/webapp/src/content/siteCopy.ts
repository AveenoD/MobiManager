/**
 * Marketing copy aligned with the main Next app landing (`app/(landing)/LandingClient.tsx` copy.en).
 * Keep this file as the single source for hero/CTA strings in frontend-gen.
 */
export const siteCopy = {
  brandName: 'MobiManager',
  /** Shown after “New |” in the hero pill */
  heroEyebrow: 'Optional add-ons: Repairs, Recharge & Elite AI',
  /** First line of headline (plain white) */
  heroTitleLead: 'Inventory, sales & operations —',
  /** Gradient phrase; period is rendered after the underline in Hero */
  heroTitleAccent: 'across every branch',
  ctaPrimary: 'Start free — no credit card',
  /** Hero only — scrolls to #demo */
  ctaBookDemo: 'Book a demo',
  ctaSecondary: 'Login',
  heroTrustChips: [
    'Free trial',
    'Cancel anytime',
    'Inventory-first',
    'Audit-ready by design',
  ] as const,
} as const
