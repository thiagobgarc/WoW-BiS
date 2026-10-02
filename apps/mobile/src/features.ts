/**
 * Surfaces that exist in the codebase but do not ship in v1.
 *
 * architecture.md Section 8.10 defers `meta` (tier list + spec build) and
 * the character Talents tab to 1.1. mobile-ux.md leaves it to Phase 4 to
 * decide *how*: the decision taken here is that the routes and the tab slot
 * exist from day one and are hidden behind these flags, so 1.1 is a flag
 * flip plus the screen's content — never a navigation restructure, which is
 * the change that would ripple through deep links and analytics.
 *
 * These are compile-time constants on purpose. A remote flag would mean
 * shipping dead UI code that a server could switch on without review.
 */
export const FEATURES = {
  /** Tier list + spec build. Deferred to 1.1. */
  meta: false,
  /** Character talents tab (diff-first list). Deferred to 1.1. */
  talents: false,
} as const;

export type FeatureName = keyof typeof FEATURES;
