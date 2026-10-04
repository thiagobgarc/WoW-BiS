/**
 * Ranks BiS by what top players actually wear (see topPlayers.ts for who
 * they are). Pure: the caller supplies the observed gear and everything
 * needed to describe an item, so this is testable without the network.
 *
 * Rules, each one a decision:
 *   - Rank by how many sampled players use the item, counting a player once
 *     per item even if they wear two copies (rings, one-hand weapons).
 *   - An item one player wears is noise, not a recommendation: an item needs
 *     MIN_USERS players to be listed.
 *   - The off-hand is listed only when most sampled players fill it. When
 *     most wield a two-hander, an off-hand target would be a false gap.
 *   - Too few players for a content type (MIN_PLAYERS) and the caller keeps
 *     the stat-fit list instead. The same for any single slot that comes out
 *     empty, so a thin sample never leaves a hole the old list could fill.
 */
import type { BisEntry, BisSlot, ContentType, Source } from '@mythos/core/bis';
import { BIS_SLOTS } from '@mythos/core/bis';

export const MIN_PLAYERS = 10;
export const MIN_USERS = 2;

const RANKS_PER_SLOT = 2;
const RANKS_PER_DUAL_SLOT = 3;
const TIER_SLOTS: BisSlot[] = ['head', 'shoulder', 'chest', 'hands', 'legs'];

export interface ObservedItem {
  slot: BisSlot;
  itemId: number;
  name: string;
  /** Blizzard tags crafted gear in its name description ("Tidal Crafted"). */
  crafted: boolean;
  /**
   * A Catalyst tier look-alike in a non-set slot: it keeps the stats of an
   * unknown input item, so it is never counted. The player still counts
   * toward the sample, which keeps every other item's share honest.
   */
  catalystAppearance?: boolean;
}

/** One sampled player's equipped gear. */
export type Observation = ObservedItem[];

export interface ItemDescription {
  source: Source;
  itemLevel: number;
  tierPiece: boolean;
  statPriorityFit: number;
}

export interface PopularResult {
  entries: BisEntry[];
  players: number;
  /** Slots left out on purpose (an off-hand most players do not use). */
  omitted: Set<BisSlot>;
}

export function derivePopularEntries(
  contentType: ContentType,
  observations: Observation[],
  describe: (item: ObservedItem, contentType: ContentType) => ItemDescription,
): PopularResult | null {
  const players = observations.length;
  if (players < MIN_PLAYERS) return null;

  const entries: BisEntry[] = [];
  const omitted = new Set<BisSlot>();

  for (const slot of BIS_SLOTS) {
    const users = new Map<number, { item: ObservedItem; count: number }>();
    let playersFillingSlot = 0;

    for (const gear of observations) {
      const inSlot = gear.filter((i) => i.slot === slot);
      if (inSlot.length > 0) playersFillingSlot++;
      const countable = inSlot.filter((i) => !i.catalystAppearance);
      for (const item of new Map(countable.map((i) => [i.itemId, i])).values()) {
        const hit = users.get(item.itemId);
        if (hit) hit.count++;
        else users.set(item.itemId, { item, count: 1 });
      }
    }

    if (slot === 'off_hand' && playersFillingSlot * 2 < players) {
      omitted.add(slot);
      continue;
    }

    const isDual = slot === 'finger' || slot === 'trinket';
    const ranked = [...users.values()]
      .filter((u) => u.count >= MIN_USERS)
      .sort((a, b) => b.count - a.count || a.item.name.localeCompare(b.item.name))
      .slice(0, isDual ? RANKS_PER_DUAL_SLOT : RANKS_PER_SLOT);

    ranked.forEach(({ item, count }, index) => {
      const description = describe(item, contentType);
      entries.push({
        slot,
        contentType,
        rank: index + 1,
        itemId: item.itemId,
        itemName: item.name,
        itemLevel: description.itemLevel,
        source: description.source,
        tierPiece: description.tierPiece,
        catalystable: !description.tierPiece && TIER_SLOTS.includes(slot),
        statPriorityFit: description.statPriorityFit,
        popularity: Math.round((count / players) * 100),
      });
    });
  }

  return { entries, players, omitted };
}

/**
 * Popular entries where the sample covers a slot, stat-fit entries where it
 * does not. A slot the sample deliberately left out (an off-hand most top
 * players don't use) stays out rather than being refilled from stat fit.
 */
export function mergeWithFallback(
  popular: BisEntry[],
  statFit: BisEntry[],
  contentType: ContentType,
  omittedSlots: ReadonlySet<BisSlot>,
): BisEntry[] {
  const covered = new Set(popular.map((e) => e.slot));
  const fallback = statFit.filter(
    (e) => e.contentType === contentType && !covered.has(e.slot) && !omittedSlots.has(e.slot),
  );
  return [...popular, ...fallback];
}
