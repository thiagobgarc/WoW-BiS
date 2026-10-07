/**
 * Entry point for the meta tier-list feature. Used by the standalone /meta
 * page and by the character page (to badge a character's own spec).
 */
import { loadTierListFile } from './loadTierList';
import { raidTierListFile } from './tierListFiles';
import type { MetaRaidDifficulty, MetaTier, MetaTierEntry, MetaTierList } from './types';

export interface TierListResult {
  list: MetaTierList | null;
  seeded: boolean;
}

export async function getMythicPlusTierList(season: string): Promise<TierListResult> {
  const list = await loadTierListFile(season, 'mythic-plus');
  return { list, seeded: list !== null };
}

export async function getRaidTierList(season: string, difficulty: MetaRaidDifficulty = 'mythic'): Promise<TierListResult> {
  const list = await loadTierListFile(season, raidTierListFile(difficulty));
  return { list, seeded: list !== null };
}

/** Every difficulty's raid list, for the tier list page's difficulty switch. */
export async function getRaidTierLists(season: string): Promise<Record<MetaRaidDifficulty, MetaTierList | null>> {
  const [mythic, heroic, normal] = await Promise.all(
    (['mythic', 'heroic', 'normal'] as const).map(async (d) => (await getRaidTierList(season, d)).list),
  );
  return { mythic: mythic ?? null, heroic: heroic ?? null, normal: normal ?? null };
}

/** Case-insensitive lookup of a specific class/spec's current tier, for the character-page badge. */
export function findTierForSpec(entries: MetaTierEntry[], className: string, specName: string): MetaTier | null {
  const match = entries.find(
    (e) => e.class.toLowerCase() === className.toLowerCase() && e.spec.toLowerCase() === specName.toLowerCase(),
  );
  return match?.tier ?? null;
}
