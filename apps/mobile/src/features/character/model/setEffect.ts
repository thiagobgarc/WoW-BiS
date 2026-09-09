/**
 * Prefixing a tier-set effect with the piece count it needs.
 *
 * `apps/web`'s tooltip renders `({requiredCount}) {text}` unconditionally.
 * Against live Blizzard data that is wrong for some effects and right for
 * others, in the same set: the *inactive* bonuses come back with the count
 * already in the display string and the active ones don't, so the web
 * renders "(4) (4) Set: Damage done increased by 10%." right underneath a
 * correctly-formatted "(2) Set: …". Seen on a real character in Phase 6,
 * not hypothesised.
 *
 * The count is worth keeping — it is what tells a player how far off the
 * next bonus is — so this prefixes only when the string hasn't already been
 * prefixed, rather than dropping it or trusting the payload.
 */

/** Matches a leading "(2)", "(4) ", etc. */
const LEADING_COUNT = /^\s*\(\d+\)/;

export function setEffectText(requiredCount: number, text: string): string {
  return LEADING_COUNT.test(text) ? text : `(${requiredCount}) ${text}`;
}
