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
import { KNOWN_WEAPON_SUBCLASSES } from './weaponProficiency';
import type { ContentType } from '@mythos/core/bis';
import { itemLevelFor, sourceFor, type LootEntry } from './deriveBisList';
import { observeGear } from './observeGear';
import { derivePopularEntries, mergeWithFallback, type ItemDescription, type ObservedItem } from './popularity';
import { NEUTRAL_FIT, parseItemStats, statPriorityFit } from './score';
import { hasWarcraftLogsCredentials, topMythicPlusPlayers, topRaidPlayers, type TopPlayer } from './topPlayers';

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
  /** Specs whose catalogue primary stat disagrees with Blizzard's. Fatal. */
  primaryStatMismatches: string[];
  /** Weapon subclasses weaponProficiency.ts has no rule for. Fatal. */
  unknownWeaponSubclasses: string[];
  /** Popular items found in no loot table and not crafted; listed as source "other". */
  unsourcedItems: string[];
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
 *
 * Primary stat is checked for the same reason: the catalogue had Devourer as
 * agility when Blizzard says intellect, which would have filtered its whole
 * weapon and trinket pool down to the wrong items without any error.
 */
export async function verifyCatalogue(
  region: string,
  specs: SpecProfile[],
): Promise<{ missingFromCatalogue: string[]; unknownToBlizzard: string[]; primaryStatMismatches: string[] }> {
  const index = await getPlayableSpecIndex(region);
  const resolved = await mapWithConcurrency(index.character_specializations, CONCURRENCY, (s) =>
    getPlayableSpec(region, s.id),
  );

  const blizzard = new Set<string>();
  const primaryStatMismatches: string[] = [];
  for (const spec of resolved) {
    if (!spec.playable_class) continue; // pet/NPC specs carry no class
    const slug = specSlug(spec.playable_class.name, spec.name);
    blizzard.add(slug);

    const apiPrimary = spec.primary_stat_type?.type.toLowerCase();
    const local = specs.find((s) => specSlug(s.class, s.spec) === slug);
    if (local && apiPrimary && local.primaryStat !== apiPrimary) {
      primaryStatMismatches.push(`${slug}: catalogue ${local.primaryStat}, Blizzard ${apiPrimary}`);
    }
  }
  const local = new Set(specs.map((s) => specSlug(s.class, s.spec)));

  return {
    missingFromCatalogue: [...blizzard].filter((s) => !local.has(s)),
    unknownToBlizzard: [...local].filter((s) => !blizzard.has(s)),
    primaryStatMismatches,
  };
}

export async function runIngest(
  region: string,
  config: SeasonConfig,
  season: string,
  onProgress?: (message: string) => void,
  options: { specs?: string[] } = {},
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

  const lootByItem = new Map<number, LootEntry[]>();
  for (const entry of lootEntries) {
    const list = lootByItem.get(entry.itemId) ?? [];
    list.push(entry);
    lootByItem.set(entry.itemId, list);
  }
  const raidName = content.raid?.name ?? config.raid.name;
  const collectedAt = new Date().toISOString().slice(0, 10);
  const useWarcraftLogs = hasWarcraftLogsCredentials();
  if (!useWarcraftLogs) log('No WCL_CLIENT_ID/WCL_CLIENT_SECRET: raid lists stay on stat fit.');
  const unsourcedItems = new Set<string>();

  const lists: BisList[] = [];
  const specs: SpecReport[] = [];
  const selected = options.specs
    ? SPEC_CATALOGUE.filter((s) => options.specs!.includes(specSlug(s.class, s.spec)))
    : SPEC_CATALOGUE;
  for (const spec of selected) {
    const slug = specSlug(spec.class, spec.spec);
    const specTierIds = new Set(tiers.bySpecSlug.get(slug)?.itemIds ?? []);
    const list = deriveBisList(spec, candidates, config, season, specTierIds);

    // Stat fit is the fallback; what top players wear replaces it wherever
    // the sample is big enough.
    const sampling: { contentType: ContentType; source: 'warcraftlogs' | 'raiderio'; players: () => Promise<TopPlayer[]> }[] = [
      ...(useWarcraftLogs
        ? [{ contentType: 'raid' as const, source: 'warcraftlogs' as const, players: () => topRaidPlayers(spec, config.raid.warcraftLogsEncounterIds) }]
        : []),
      { contentType: 'mythic-plus', source: 'raiderio', players: () => topMythicPlusPlayers(spec, config.raiderIoSeason) },
    ];
    const samples: NonNullable<BisList['samples']> = {};

    for (const { contentType, source, players } of sampling) {
      const observations = await observeGear(await players(), spec);

      // Stat fit for items the loot tables never fetched (crafted gear).
      const unknownIds = [...new Set(observations.flat().map((i) => i.itemId))].filter((id) => !items.has(id));
      for (const [id, item] of await mapWithConcurrency(unknownIds, CONCURRENCY, async (id) => [id, await getIngestItem(region, id)] as const)) {
        if (item) items.set(id, item);
      }

      const describe = (item: ObservedItem, ct: ContentType): ItemDescription => {
        const detail = items.get(item.itemId);
        const fit = detail ? statPriorityFit(parseItemStats(detail), spec.statPriority) : NEUTRAL_FIT;
        if (specTierIds.has(item.itemId)) {
          return { source: { type: 'raid', instance: raidName, difficulty: 'mythic' }, itemLevel: itemLevelFor('raid', config), tierPiece: true, statPriorityFit: fit };
        }
        const drops = lootByItem.get(item.itemId) ?? [];
        const drop = drops.find((d) => d.contentType === ct) ?? drops[0];
        if (drop) {
          return { source: sourceFor(drop), itemLevel: itemLevelFor(drop.contentType, config), tierPiece: false, statPriorityFit: fit };
        }
        if (item.crafted) {
          return { source: { type: 'crafted' }, itemLevel: config.crafted.sparkUpgradeIlvlCaps[5], tierPiece: false, statPriorityFit: fit };
        }
        unsourcedItems.add(item.name);
        return { source: { type: 'other' }, itemLevel: itemLevelFor(ct, config), tierPiece: false, statPriorityFit: fit };
      };

      const popular = derivePopularEntries(contentType, observations, describe);
      if (!popular) {
        log(`  ${spec.spec} ${spec.class} ${contentType}: only ${observations.length} players, keeping stat fit`);
        continue;
      }
      list.entries = [
        ...list.entries.filter((e) => e.contentType !== contentType),
        ...mergeWithFallback(popular.entries, list.entries, contentType, popular.omitted),
      ];
      samples[contentType] = { players: popular.players, source, collectedAt };
    }

    if (Object.keys(samples).length > 0) list.samples = samples;
    log(
      `${spec.spec} ${spec.class}: raid ${samples.raid?.players ?? 'stat fit'}, ` +
        `M+ ${samples['mythic-plus']?.players ?? 'stat fit'} players`,
    );
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
      primaryStatMismatches: catalogue.primaryStatMismatches,
      unsourcedItems: [...unsourcedItems].sort(),
      unknownWeaponSubclasses: [
        ...new Set(
          candidates
            .filter((c) => c.slot === 'main_hand' || c.slot === 'off_hand')
            .map((c) => c.item.item_subclass?.name ?? '(none)')
            .filter((name) => !KNOWN_WEAPON_SUBCLASSES.has(name)),
        ),
      ],
    },
  };
}

export { ALL_SLOT_COUNT };
