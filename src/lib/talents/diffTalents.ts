/**
 * Pure, I/O-free comparison between a character's current talent
 * selections and a recommended build — no fetch, no DB, trivially
 * unit-testable (see diffTalents.test.ts). Mirrors compareGear.ts's
 * architecture for the gear side.
 */
import type { TalentSelection } from '@/lib/blizzard/domain';
import type { RecommendedSelection } from './types';

export interface TalentMatchResult {
  matched: number;
  total: number;
  /** nodeIds picked in the recommended build but not matched by the current build (missing, or picked a different CHOICE option). */
  missingNodeIds: number[];
}

function key(nodeId: number, optionIndex: number): string {
  return `${nodeId}:${optionIndex}`;
}

/** A recommended pick "matches" when the same node is selected with the same CHOICE option (rank isn't compared — a lower rank still counts as "picked"). */
export function diffTalents(current: TalentSelection[] | null, recommended: RecommendedSelection[]): TalentMatchResult {
  const currentKeys = new Set((current ?? []).map((s) => key(s.nodeId, s.optionIndex)));

  let matched = 0;
  const missingNodeIds: number[] = [];
  for (const rec of recommended) {
    if (currentKeys.has(key(rec.nodeId, rec.optionIndex))) {
      matched += 1;
    } else {
      missingNodeIds.push(rec.nodeId);
    }
  }

  return { matched, total: recommended.length, missingNodeIds };
}
