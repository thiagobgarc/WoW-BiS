/**
 * Turns Blizzard's loot tables into a ranked BiS list per spec.
 *
 * The split here is deliberate: `collectLootEntries` and `buildCandidates`
 * and `deriveBisList` are pure, and the only I/O (fetching item detail for
 * every id the journal mentions) lives in the orchestrator. That is what lets
 * the ranking be tested against fixtures instead of the live API.
 *
 * What this does NOT model, stated plainly because the output is advice:
 *   - Trinkets and weapons are ranked on stat fit and item level. Their real
 *     value is in procs and on-use effects, which only a sim can evaluate.
 *     Those entries carry a note saying so.
 *   - PvP gear has no journal encounter to read, so no PvP entries are
 *     derived at all. The old hand-authored seeds had some; they were built
 *     on item ids that do not exist, so losing them loses nothing real.
 *   - Per-boss item level progression within a raid is not modelled, matching
 *     the existing seasonConfig note: one item level per difficulty.
 */
import {
  BIS_SLOTS,
  type BisEntry,
  type BisList,
  type BisSlot,
  type ContentType,
  type Source,
} from '@mythos/core/bis';
import type { IngestItem } from '@/lib/blizzard/schemas';
import type { SeasonConfig } from '@/lib/season/seasonConfig';
import type { ResolvedSeasonContent } from './resolveSeasonContent';
import { bisSlotFor, isRankableGear, isUsableBySpec, parseItemStats, statPriorityFit, type ParsedStats } from './score';
import { specSlug, type SpecProfile } from './specCatalogue';

/** Slots the Catalyst can convert a non-tier piece into a tier piece for. */
const TIER_SLOTS: BisSlot[] = ['head', 'shoulder', 'chest', 'hands', 'legs'];

/** How many ranks to keep per slot. Dual-slot categories need at least two. */
const RANKS_PER_SLOT = 2;
const RANKS_PER_DUAL_SLOT = 3;

export interface LootEntry {
  itemId: number;
  itemName: string;
  contentType: ContentType;
  instance: string;
  boss: string;
}

/** Pure: flattens resolved journal content into one loot entry per item drop. */
export function collectLootEntries(content: ResolvedSeasonContent): LootEntry[] {
  const entries: LootEntry[] = [];

  const push = (instance: string, contentType: ContentType, encounters: ResolvedSeasonContent['dungeons'][number]['encounters']) => {
    for (const encounter of encounters) {
      for (const drop of encounter.items ?? []) {
        entries.push({
          itemId: drop.item.id,
          itemName: drop.item.name,
          contentType,
          instance,
          boss: encounter.name,
        });
      }
    }
  };

  if (content.raid) push(content.raid.name, 'raid', content.raid.encounters);
  for (const dungeon of content.dungeons) push(dungeon.name, 'mythic-plus', dungeon.encounters);

  return entries;
}

export interface Candidate {
  itemId: number;
  itemName: string;
  slot: BisSlot;
  contentType: ContentType;
  itemLevel: number;
  source: Source;
  stats: ParsedStats;
  setName: string | null;
  item: IngestItem;
  /** Belongs to SOME spec's tier set — not necessarily the one being ranked. */
  isTierOfSomeSpec: boolean;
}

/**
 * Item level comes from seasonConfig, never from the API's `level` field: the
 * static item endpoint reports a base level (219 for current raid gear) that
 * no actual drop has. Difficulty scaling is what makes it 318.
 */
function itemLevelFor(contentType: ContentType, config: SeasonConfig): number {
  if (contentType === 'raid') return config.raid.difficultyIlvl.mythic;
  // The +10 end-of-dungeon reward, which is the ceiling for non-vault
  // dungeon loot — pushing higher keys raises rating, not item level.
  return config.mythicPlus.ilvlByKeyLevel[10] ?? config.raid.difficultyIlvl.heroic;
}

function sourceFor(entry: LootEntry): Source {
  if (entry.contentType === 'raid') {
    return { type: 'raid', instance: entry.instance, boss: entry.boss, difficulty: 'mythic' };
  }
  return { type: 'dungeon', dungeon: entry.instance, boss: entry.boss, keyLevel: 10 };
}

/** Pure: pairs loot entries with their fetched item detail. */
export function buildCandidates(
  entries: LootEntry[],
  items: Map<number, IngestItem>,
  config: SeasonConfig,
  allTierItemIds: ReadonlySet<number> = new Set(),
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const entry of entries) {
    const item = items.get(entry.itemId);
    if (!item || !isRankableGear(item)) continue;
    const slot = bisSlotFor(item);
    if (!slot) continue;

    candidates.push({
      itemId: item.id,
      itemName: item.name,
      slot,
      contentType: entry.contentType,
      itemLevel: itemLevelFor(entry.contentType, config),
      source: sourceFor(entry),
      stats: parseItemStats(item),
      setName: item.preview_item?.set?.item_set?.name ?? null,
      item,
      isTierOfSomeSpec: allTierItemIds.has(item.id),
    });
  }

  return candidates;
}

/**
 * Tier pieces as candidates. They are absent from journal encounter tables,
 * so without this they would never be ranked at all. The source names the
 * raid but no boss on purpose: a tier piece comes from several encounters,
 * the Great Vault and the Catalyst, so naming one boss would be a lie.
 */
export function buildTierCandidates(
  tierItemIds: number[],
  items: Map<number, IngestItem>,
  config: SeasonConfig,
  raidName: string,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const id of tierItemIds) {
    const item = items.get(id);
    if (!item || !isRankableGear(item)) continue;
    const slot = bisSlotFor(item);
    if (!slot) continue;

    candidates.push({
      itemId: item.id,
      itemName: item.name,
      slot,
      contentType: 'raid',
      itemLevel: itemLevelFor('raid', config),
      source: { type: 'raid', instance: raidName, difficulty: 'mythic' },
      stats: parseItemStats(item),
      setName: item.preview_item?.set?.item_set?.name ?? null,
      item,
      isTierOfSomeSpec: true,
    });
  }

  return candidates;
}

function noteFor(candidate: Candidate): string | undefined {
  if (candidate.slot === 'trinket') {
    return 'Ranked on stat fit and item level only — trinket procs need a sim to evaluate.';
  }
  if (candidate.stats.secondaryEmpty) {
    return 'No secondary stats on this item, so it is ranked by item level alone.';
  }
  return undefined;
}

/** Pure: ranks the candidate pool for one spec into a BiS list. */
export function deriveBisList(
  spec: SpecProfile,
  candidates: Candidate[],
  config: SeasonConfig,
  season: string,
  /** This spec's tier item ids, from the item-set endpoint. */
  tierItemIds: ReadonlySet<number> = new Set(),
): BisList {
  const tierSetName = config.tierSets[specSlug(spec.class, spec.spec)]?.name ?? null;
  const isTier = (c: Candidate) =>
    tierItemIds.has(c.itemId) || (tierSetName !== null && c.setName === tierSetName);
  const entries: BisEntry[] = [];

  // Another spec's tier piece is still armor of the right class, so it would
  // otherwise rank as a normal candidate. Exclude tier that is not this
  // spec's: a Death Knight should never be told to chase a Mage's set.
  const usable = candidates.filter(
    (c) => isUsableBySpec(c.item, spec.armorType) && (!c.isTierOfSomeSpec || isTier(c)),
  );

  for (const contentType of ['raid', 'mythic-plus'] as const) {
    for (const slot of BIS_SLOTS) {
      const pool = usable.filter((c) => c.slot === slot && c.contentType === contentType);
      if (pool.length === 0) continue;

      const isDual = slot === 'finger' || slot === 'trinket';
      const keep = isDual ? RANKS_PER_DUAL_SLOT : RANKS_PER_SLOT;

      const ranked = pool
        .map((c) => ({ candidate: c, fit: statPriorityFit(c.stats, spec.statPriority) }))
        .sort((a, b) => {
          const aTier = isTier(a.candidate);
          const bTier = isTier(b.candidate);
          // Fit first: within one content type every drop shares an item
          // level, so stat fit is what actually separates them. Tier breaks
          // ties, because a set bonus beats a marginally better stat roll.
          if (b.fit !== a.fit) return b.fit - a.fit;
          if (aTier !== bTier) return aTier ? -1 : 1;
          if (b.candidate.itemLevel !== a.candidate.itemLevel) return b.candidate.itemLevel - a.candidate.itemLevel;
          return a.candidate.itemName.localeCompare(b.candidate.itemName);
        })
        // The same item can drop from more than one encounter; rank it once.
        .filter((entry, i, all) => all.findIndex((o) => o.candidate.itemId === entry.candidate.itemId) === i)
        .slice(0, keep);

      ranked.forEach(({ candidate, fit }, index) => {
        const tierPiece = isTier(candidate);
        entries.push({
          slot,
          contentType,
          rank: index + 1,
          itemId: candidate.itemId,
          itemName: candidate.itemName,
          itemLevel: candidate.itemLevel,
          source: candidate.source,
          tierPiece,
          catalystable: !tierPiece && TIER_SLOTS.includes(slot),
          statPriorityFit: fit,
          notes: noteFor(candidate),
        });
      });
    }
  }

  return {
    season,
    class: spec.class,
    spec: spec.spec,
    armorType: spec.armorType,
    statPriority: spec.statPriority,
    entries,
  };
}
