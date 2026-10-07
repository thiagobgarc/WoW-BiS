/**
 * File names of the tier-list seeds under /data/meta/{season}. Its own module
 * so scripts run under Bun can import it: loadTierList.ts uses Vite's
 * import.meta.glob, which only exists inside the app's build.
 */
import type { MetaRaidDifficulty } from './types';

/**
 * Mythic keeps the original file name (raid-tier-list.json), so a season
 * seeded before difficulties existed still reads as its Mythic list.
 */
export function raidTierListFile(difficulty: MetaRaidDifficulty): string {
  return difficulty === 'mythic' ? 'raid' : `raid-${difficulty}`;
}
