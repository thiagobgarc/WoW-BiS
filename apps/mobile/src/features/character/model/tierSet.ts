/**
 * Tier-set progress for the header.
 *
 * Ported from `apps/web`'s `CharacterHeader`, which computes it inline. It
 * moves out here because it is the one number in the header that is derived
 * rather than read, and because the bonus thresholds are game rules — a
 * component is the wrong place to keep a rule that has a right answer.
 */
import type { EquipmentBySlot, EquipmentSlot } from '@mythos/core/character';

/** The five slots current-expansion tier sets occupy. */
export const TIER_SLOTS = [
  'head',
  'shoulder',
  'chest',
  'hands',
  'legs',
] as const satisfies readonly EquipmentSlot[];

export interface TierSetSummary {
  owned: number;
  total: number;
  /** The set bonus actually active — 0, 2 or 4 pieces. */
  bonus: 0 | 2 | 4;
  /** Human phrasing of `bonus`, used in the badge and its accessibility label. */
  label: string;
}

export function tierSetSummary(equipment: EquipmentBySlot): TierSetSummary {
  const owned = TIER_SLOTS.filter((slot) => equipment[slot]?.isTierPiece).length;
  // 3 pieces is a 2pc bonus, not a 3pc one — the thresholds are 2 and 4.
  const bonus = owned >= 4 ? 4 : owned >= 2 ? 2 : 0;

  return {
    owned,
    total: TIER_SLOTS.length,
    bonus,
    label: bonus === 0 ? 'no bonus active' : `${bonus}pc active`,
  };
}
