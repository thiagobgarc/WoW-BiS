/**
 * Entry point for the meta tier-list feature. Used by the standalone /meta
 * page and by the character page (to badge a character's own spec).
 */
import { loadTierListFile } from './loadTierList';
import type { MetaTier, MetaTierEntry, MetaTierList } from './types';

export interface TierListResult {
  list: MetaTierList | null;
  seeded: boolean;
}

export async function getMythicPlusTierList(season: string): Promise<TierListResult> {
  const list = await loadTierListFile(season, 'mythic-plus');
  return { list, seeded: list !== null };
}

/** Case-insensitive lookup of a specific class/spec's current tier, for the character-page badge. */
export function findTierForSpec(entries: MetaTierEntry[], className: string, specName: string): MetaTier | null {
  const match = entries.find(
    (e) => e.class.toLowerCase() === className.toLowerCase() && e.spec.toLowerCase() === specName.toLowerCase(),
  );
  return match?.tier ?? null;
}
