/**
 * Orchestrates one ingest run: resolve season content, read every loot table,
 * fetch the item detail behind each drop, then derive a list per spec.
 *
 * All Blizzard reads go through client.ts, which caches static data for seven
 * days. A warm second run therefore makes almost no outbound requests, which
 * matters because a cold run is roughly 500 item lookups.
 */
import { getIngestItem, getPlayableSpec, getPlayableSpecIndex } from '@/lib/blizzard/client';
import type { IngestItem } from '@/lib/blizzard/schemas';
import type { BisList } from '@mythos/core/bis';
import type { SeasonConfig } from '@/lib/season/seasonConfig';
import { buildCandidates, buildTierCandidates, collectLootEntries, deriveBisList, type Candidate } from './deriveBisList';
import { resolveSeasonContent } from './resolveSeasonContent';
import { SPEC_CATALOGUE, specSlug, type SpecProfile } from './specCatalogue';
import { resolveTierSets } from './tierSets';

/** Blizzard allows 100 req/s; this stays far enough under to be a good citizen. */
const CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface SpecReport {
  class: string;
  spec: string;
  provenance: SpecProfile['provenance'];
  entryCount: number;
  slotsCovered: number;
  tierPieces: number;
  missingSlots: string[];
}

export interface IngestReport {
  season: string;
  region: string;
  raid: string | null;
  dungeons: string[];
  /** seasonConfig names that matched no journal instance. Treated as fatal. */
  unresolved: string[];
  lootEntries: number;
  uniqueItems: number;
  itemsFetched: number;
  itemsMissing: number;
  rankableItems: number;
  specs: SpecReport[];
  /** Tier set names in seasonConfig that matched no Blizzard item set. */
  tierSetsUnresolved: string[];
  /** Specs with no tier set configured in seasonConfig, so no tier pieces. */
  specsWithoutTierSet: string[];
  /** Specs Blizzard publishes that specCatalogue.ts does not list. Fatal. */
  specsMissingFromCatalogue: string[];
  /** Specs the catalogue lists that Blizzard does not publish. Fatal. */
  specsUnknownToBlizzard: string[];
}

export interface IngestResult {
  lists: BisList[];
  report: IngestReport;
}

const ALL_SLOT_COUNT = 14;

function reportForSpec(spec: SpecProfile, list: BisList): SpecReport {
  const slots = new Set(list.entries.map((e) => e.slot));
  const allSlots = [
    'head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands',
    'waist', 'legs', 'feet', 'finger', 'trinket', 'main_hand', 'off_hand',
  ];
  return {
    class: spec.class,
    spec: spec.spec,
    provenance: spec.provenance,
    entryCount: list.entries.length,
    slotsCovered: slots.size,
    tierPieces: list.entries.filter((e) => e.tierPiece).length,
    missingSlots: allSlots.filter((s) => !slots.has(s as never)),
  };
}

/**
 * Cross-checks the hand-maintained spec catalogue against Blizzard's own
 * specialization index.
 *
 * This exists because the catalogue was wrong on its first run: it listed 39
 * specs and Blizzard publishes 40, missing Demon Hunter Devourer. A missing
 * spec produces no BiS list and no error, which is indistinguishable from a
 * clean run — exactly the failure mode worth paying a few cached requests to
 * rule out.
 */
export async function verifyCatalogue(
  region: string,
  specs: SpecProfile[],
): Promise<{ missingFromCatalogue: string[]; unknownToBlizzard: string[] }> {
  const index = await getPlayableSpecIndex(region);
  const resolved = await mapWithConcurrency(index.character_specializations, CONCURRENCY, (s) =>
    getPlayableSpec(region, s.id),
  );

  const blizzard = new Set<string>();
  for (const spec of resolved) {
    if (!spec.playable_class) continue; // pet/NPC specs carry no class
    blizzard.add(specSlug(spec.playable_class.name, spec.name));
  }
  const local = new Set(specs.map((s) => specSlug(s.class, s.spec)));

  return {
    missingFromCatalogue: [...blizzard].filter((s) => !local.has(s)),
    unknownToBlizzard: [...local].filter((s) => !blizzard.has(s)),
  };
}

export async function runIngest(
  region: string,
  config: SeasonConfig,
  season: string,
  onProgress?: (message: string) => void,
): Promise<IngestResult> {
  const log = onProgress ?? (() => {});

  log('Cross-checking the spec catalogue against Blizzard...');
  const catalogue = await verifyCatalogue(region, SPEC_CATALOGUE);

  log('Resolving season content against the journal index...');
  const content = await resolveSeasonContent(region, config);

  log('Resolving tier sets (absent from journal loot tables, so fetched separately)...');
  const tiers = await resolveTierSets(region, config, SPEC_CATALOGUE);
  const tierItemIds = [...new Set([...tiers.bySpecSlug.values()].flatMap((t) => t.itemIds))];

  const lootEntries = collectLootEntries(content);
  const uniqueIds = [...new Set([...lootEntries.map((e) => e.itemId), ...tierItemIds])];
  log(
    `${lootEntries.length} loot entries plus ${tierItemIds.length} tier pieces, ` +
      `${uniqueIds.length} distinct items. Fetching item detail...`,
  );

  const fetched = await mapWithConcurrency(uniqueIds, CONCURRENCY, async (id) => {
    const item = await getIngestItem(region, id);
    return [id, item] as const;
  });

  const items = new Map<number, IngestItem>();
  let missing = 0;
  for (const [id, item] of fetched) {
    if (item) items.set(id, item);
    else missing++;
  }

  const allTierIds = new Set(tierItemIds);
  const candidates: Candidate[] = [
    ...buildCandidates(lootEntries, items, config, allTierIds),
    ...buildTierCandidates(tierItemIds, items, config, content.raid?.name ?? config.raid.name),
  ];
  log(`${candidates.length} rankable gear drops. Deriving ${SPEC_CATALOGUE.length} spec lists...`);

  const lists: BisList[] = [];
  const specs: SpecReport[] = [];
  for (const spec of SPEC_CATALOGUE) {
    const slug = specSlug(spec.class, spec.spec);
    const specTierIds = new Set(tiers.bySpecSlug.get(slug)?.itemIds ?? []);
    const list = deriveBisList(spec, candidates, config, season, specTierIds);
    lists.push(list);
    specs.push(reportForSpec(spec, list));
  }

  return {
    lists,
    report: {
      season,
      region,
      raid: content.raid?.name ?? null,
      dungeons: content.dungeons.map((d) => d.name),
      unresolved: content.unresolved,
      lootEntries: lootEntries.length,
      uniqueItems: uniqueIds.length,
      itemsFetched: items.size,
      itemsMissing: missing,
      rankableItems: candidates.length,
      specs,
      tierSetsUnresolved: tiers.unresolved,
      specsWithoutTierSet: tiers.specsWithoutTierSet,
      specsMissingFromCatalogue: catalogue.missingFromCatalogue,
      specsUnknownToBlizzard: catalogue.unknownToBlizzard,
    },
  };
}

export { ALL_SLOT_COUNT };
