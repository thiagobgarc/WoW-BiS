/**
 * Resolves each spec's tier set to its real item ids.
 *
 * Tier pieces do not appear in journal encounter loot tables — verified
 * against The Venomous Abyss, where none of the season's six sets show up in
 * any encounter's items, and only one unrelated set appears across all 325
 * gear drops. The item-set endpoint is therefore the only first-party route
 * to them, and without this step every derived list would carry
 * `tierPiece: false` on every entry while the UI happily reported "4pc
 * active" from the character's own gear.
 *
 * seasonConfig.tierSets supplies the names; all six resolve to real Blizzard
 * item-set ids (2055-2063), so the names are trustworthy. It only covers six
 * specs, though, so the other 33 get no tier pieces at all — the ingest
 * reports that rather than hiding it.
 */
import { getItemSet, getItemSetIndex } from '@/lib/blizzard/client';
import type { SeasonConfig } from '@/lib/season/seasonConfig';
import { normaliseName } from './resolveSeasonContent';
import { specSlug, type SpecProfile } from './specCatalogue';

export interface ResolvedTierSet {
  specSlug: string;
  setId: number;
  name: string;
  itemIds: number[];
}

export interface TierSetResolution {
  bySpecSlug: Map<string, ResolvedTierSet>;
  /** Tier set names in seasonConfig that matched no Blizzard item set. */
  unresolved: string[];
  /** Specs with no tier set configured at all. */
  specsWithoutTierSet: string[];
}

export async function resolveTierSets(
  region: string,
  config: SeasonConfig,
  specs: SpecProfile[],
): Promise<TierSetResolution> {
  const configured = Object.entries(config.tierSets);
  const bySpecSlug = new Map<string, ResolvedTierSet>();
  const unresolved: string[] = [];

  if (configured.length > 0) {
    const index = await getItemSetIndex(region);
    const byName = new Map(index.item_sets.map((s) => [normaliseName(s.name), s]));

    for (const [slug, tier] of configured) {
      const hit = byName.get(normaliseName(tier.name));
      if (!hit) {
        unresolved.push(tier.name);
        continue;
      }
      const set = await getItemSet(region, hit.id);
      bySpecSlug.set(slug, {
        specSlug: slug,
        setId: hit.id,
        name: set.name ?? tier.name,
        itemIds: (set.items ?? []).map((i) => i.id),
      });
    }
  }

  const specsWithoutTierSet = specs
    .map((s) => specSlug(s.class, s.spec))
    .filter((slug) => !bySpecSlug.has(slug));

  return { bySpecSlug, unresolved, specsWithoutTierSet };
}
