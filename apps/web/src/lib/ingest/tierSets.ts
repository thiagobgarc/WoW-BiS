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
 * seasonConfig.classTierSets supplies one set name per class (Blizzard item
 * sets 2055-2067). Tier is per class, so every spec of a class gets that
 * class's pieces. This used to be keyed per spec and covered only six specs,
 * which left the other 34 with no tier pieces at all.
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
  const bySpecSlug = new Map<string, ResolvedTierSet>();
  const unresolved: string[] = [];
  const classSets = Object.entries(config.classTierSets);

  if (classSets.length > 0) {
    const index = await getItemSetIndex(region);
    const byName = new Map(index.item_sets.map((s) => [normaliseName(s.name), s]));

    // Tier is per class: resolve each class's set once, give it to every spec.
    for (const [className, setName] of classSets) {
      const hit = byName.get(normaliseName(setName));
      if (!hit) {
        unresolved.push(setName);
        continue;
      }
      const set = await getItemSet(region, hit.id);
      for (const spec of specs.filter((s) => s.class === className)) {
        const slug = specSlug(spec.class, spec.spec);
        bySpecSlug.set(slug, {
          specSlug: slug,
          setId: hit.id,
          name: set.name ?? setName,
          itemIds: (set.items ?? []).map((i) => i.id),
        });
      }
    }
  }

  const specsWithoutTierSet = specs
    .map((s) => specSlug(s.class, s.spec))
    .filter((slug) => !bySpecSlug.has(slug));

  return { bySpecSlug, unresolved, specsWithoutTierSet };
}
