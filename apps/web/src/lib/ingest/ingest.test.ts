/**
 * Covers the pure half of the ingest: the mapping and ranking decisions that
 * turn Blizzard's loot tables into a BiS list. Nothing here touches the
 * network — the orchestrator owns all I/O precisely so this can be tested
 * against fixtures.
 */
import { describe, expect, it } from 'vitest';
import type { IngestItem } from '@/lib/blizzard/schemas';
import { seasonConfig } from '@/lib/season/seasonConfig';
import {
  bisSlotFor,
  isRankableGear,
  isUsableBySpec,
  NEUTRAL_FIT,
  parseItemStats,
  statPriorityFit,
} from './score';
import { buildCandidates, collectLootEntries, deriveBisList, type LootEntry } from './deriveBisList';
import { normaliseName } from './resolveSeasonContent';
import { SPEC_CATALOGUE, findSpec } from './specCatalogue';

type StatTuple = [string, number];

function item(overrides: Partial<IngestItem> & { id: number }, stats: StatTuple[] = []): IngestItem {
  const { preview_item: previewOverride, ...rest } = overrides;
  return {
    name: `Item ${overrides.id}`,
    level: 219,
    quality: { type: 'EPIC' },
    inventory_type: { type: 'HEAD' },
    ...rest,
    preview_item: {
      stats: stats.map(([type, value]) => ({ type: { type }, value })),
      set: previewOverride?.set,
    },
  } as IngestItem;
}

describe('parseItemStats', () => {
  it('splits primary from secondary', () => {
    const stats = parseItemStats(item({ id: 1 }, [['INTELLECT', 65], ['CRIT_RATING', 70], ['HASTE_RATING', 30]]));
    expect(stats.primary).toEqual({ intellect: 65 });
    expect(stats.secondary).toEqual({ crit: 70, haste: 30, mastery: 0, versatility: 0 });
    expect(stats.secondaryEmpty).toBe(false);
  });

  it('ignores negated stats, which are a downgrade and contribute no budget', () => {
    const raw = item({ id: 2 }, [['CRIT_RATING', 70]]);
    raw.preview_item!.stats![0]!.is_negated = true;
    expect(parseItemStats(raw).secondaryEmpty).toBe(true);
  });
});

describe('statPriorityFit', () => {
  const priority = ['haste', 'crit', 'versatility', 'mastery'] as const;

  it('scores 100 when the whole budget sits on the top stat', () => {
    const stats = parseItemStats(item({ id: 3 }, [['HASTE_RATING', 100]]));
    expect(statPriorityFit(stats, [...priority])).toBe(100);
  });

  it('scores lowest when the whole budget sits on the worst stat', () => {
    const stats = parseItemStats(item({ id: 4 }, [['MASTERY_RATING', 100]]));
    expect(statPriorityFit(stats, [...priority])).toBe(20);
  });

  it('ranks a top-stat item above a balanced one', () => {
    const top = parseItemStats(item({ id: 5 }, [['HASTE_RATING', 100]]));
    const split = parseItemStats(item({ id: 6 }, [['HASTE_RATING', 50], ['MASTERY_RATING', 50]]));
    expect(statPriorityFit(top, [...priority])).toBeGreaterThan(statPriorityFit(split, [...priority]));
  });

  it('returns a neutral score for an item with no secondaries rather than zero', () => {
    const none = parseItemStats(item({ id: 7 }, [['INTELLECT', 61]]));
    expect(statPriorityFit(none, [...priority])).toBe(NEUTRAL_FIT);
  });
});

describe('slot and gear mapping', () => {
  it('collapses rings and trinkets to the pooled BiS categories', () => {
    expect(bisSlotFor(item({ id: 8, inventory_type: { type: 'FINGER' } }))).toBe('finger');
    expect(bisSlotFor(item({ id: 9, inventory_type: { type: 'TRINKET' } }))).toBe('trinket');
  });

  it('maps shields and holdables to the off hand', () => {
    expect(bisSlotFor(item({ id: 10, inventory_type: { type: 'SHIELD' } }))).toBe('off_hand');
    expect(bisSlotFor(item({ id: 11, inventory_type: { type: 'HOLDABLE' } }))).toBe('off_hand');
  });

  it('rejects the cosmetics and housing decor that share the loot tables', () => {
    expect(isRankableGear(item({ id: 12, inventory_type: { type: 'NON_EQUIP' } }))).toBe(false);
    // Transmog copies report item level 1.
    expect(isRankableGear(item({ id: 13, level: 1 }))).toBe(false);
    expect(isRankableGear(item({ id: 14 }))).toBe(true);
  });
});

describe('isUsableBySpec', () => {
  it('gates armor on armor class', () => {
    const plate = item({ id: 15, item_subclass: { name: 'Plate' } });
    expect(isUsableBySpec(plate, 'plate')).toBe(true);
    expect(isUsableBySpec(plate, 'cloth')).toBe(false);
  });

  it('lets jewellery and weapons through, which carry no armor class', () => {
    const ring = item({ id: 16, inventory_type: { type: 'FINGER' }, item_subclass: { name: 'Miscellaneous' } });
    expect(isUsableBySpec(ring, 'plate')).toBe(true);
    expect(isUsableBySpec(ring, 'cloth')).toBe(true);
  });

  /**
   * Regression. Armor has an adaptive primary stat and the static item
   * endpoint reports one representative allocation — this season's plate
   * reports INTELLECT. Filtering on primary stat excluded every strength and
   * agility spec from all armor and left them with 4 slots of 14.
   */
  it('does not filter plate reporting INTELLECT away from a strength spec', () => {
    const plate = item({ id: 17, item_subclass: { name: 'Plate' } }, [['INTELLECT', 65], ['CRIT_RATING', 31]]);
    expect(isUsableBySpec(plate, 'plate')).toBe(true);
  });
});

describe('collectLootEntries', () => {
  it('tags raid drops as raid and dungeon drops as mythic-plus', () => {
    const entries = collectLootEntries({
      raid: {
        id: 1,
        name: 'The Venomous Abyss',
        encounters: [{ id: 10, name: 'Ula-tek', items: [{ id: 1, item: { id: 100, name: 'Raid Helm' } }] }],
      },
      dungeons: [
        {
          id: 2,
          name: 'Altar of Fangs',
          encounters: [{ id: 20, name: 'Fang', items: [{ id: 2, item: { id: 200, name: 'Dungeon Helm' } }] }],
        },
      ],
      unresolved: [],
    });

    expect(entries).toEqual([
      { itemId: 100, itemName: 'Raid Helm', contentType: 'raid', instance: 'The Venomous Abyss', boss: 'Ula-tek' },
      { itemId: 200, itemName: 'Dungeon Helm', contentType: 'mythic-plus', instance: 'Altar of Fangs', boss: 'Fang' },
    ]);
  });
});

describe('deriveBisList', () => {
  const spec = findSpec('Mage', 'Fire')!; // cloth, priority haste > mastery > versatility > crit

  function candidatesFrom(items: IngestItem[], tierIds = new Set<number>()) {
    const entries: LootEntry[] = items.map((i) => ({
      itemId: i.id,
      itemName: i.name,
      contentType: 'raid',
      instance: 'The Venomous Abyss',
      boss: 'A Boss',
    }));
    const map = new Map(items.map((i) => [i.id, i]));
    return buildCandidates(entries, map, seasonConfig, tierIds);
  }

  it('ranks the better stat fit first', () => {
    const good = item({ id: 30, name: 'Haste Helm', item_subclass: { name: 'Cloth' } }, [['HASTE_RATING', 100]]);
    const bad = item({ id: 31, name: 'Crit Helm', item_subclass: { name: 'Cloth' } }, [['CRIT_RATING', 100]]);
    const list = deriveBisList(spec, candidatesFrom([bad, good]), seasonConfig, 'midnight-s2');
    const head = list.entries.filter((e) => e.slot === 'head').sort((a, b) => a.rank - b.rank);
    expect(head[0]!.itemName).toBe('Haste Helm');
    expect(head[1]!.itemName).toBe('Crit Helm');
  });

  it('uses the season item level, not the API base level', () => {
    const helm = item({ id: 32, item_subclass: { name: 'Cloth' } }, [['HASTE_RATING', 100]]);
    const list = deriveBisList(spec, candidatesFrom([helm]), seasonConfig, 'midnight-s2');
    expect(list.entries[0]!.itemLevel).toBe(seasonConfig.raid.difficultyIlvl.mythic);
    expect(list.entries[0]!.itemLevel).not.toBe(helm.level);
  });

  it('never offers another spec a tier piece that is not theirs', () => {
    const foreignTier = item({ id: 33, name: 'Someone Else Tier', item_subclass: { name: 'Cloth' } }, [['HASTE_RATING', 100]]);
    const ordinary = item({ id: 34, name: 'Ordinary Helm', item_subclass: { name: 'Cloth' } }, [['HASTE_RATING', 50]]);
    const candidates = candidatesFrom([foreignTier, ordinary], new Set([33]));
    // 33 is tier, but not THIS spec's tier (empty set passed below).
    const list = deriveBisList(spec, candidates, seasonConfig, 'midnight-s2', new Set());
    expect(list.entries.map((e) => e.itemName)).not.toContain('Someone Else Tier');
    expect(list.entries.map((e) => e.itemName)).toContain('Ordinary Helm');
  });

  it('includes the spec own tier piece and flags it', () => {
    const ownTier = item({ id: 35, name: 'Our Tier', item_subclass: { name: 'Cloth' } }, [['HASTE_RATING', 100]]);
    const candidates = candidatesFrom([ownTier], new Set([35]));
    const list = deriveBisList(spec, candidates, seasonConfig, 'midnight-s2', new Set([35]));
    expect(list.entries[0]!.tierPiece).toBe(true);
    // A tier piece is already tier, so it is not a catalyst target.
    expect(list.entries[0]!.catalystable).toBe(false);
  });

  it('ranks an item once even when it drops from several encounters', () => {
    const helm = item({ id: 36, name: 'Shared Helm', item_subclass: { name: 'Cloth' } }, [['HASTE_RATING', 100]]);
    const entries: LootEntry[] = ['Boss A', 'Boss B'].map((boss) => ({
      itemId: 36,
      itemName: 'Shared Helm',
      contentType: 'raid' as const,
      instance: 'The Venomous Abyss',
      boss,
    }));
    const candidates = buildCandidates(entries, new Map([[36, helm]]), seasonConfig);
    const list = deriveBisList(spec, candidates, seasonConfig, 'midnight-s2');
    expect(list.entries.filter((e) => e.itemId === 36)).toHaveLength(1);
  });

  it('keeps a deeper bench for dual slots than for single ones', () => {
    const rings = [1, 2, 3, 4].map((n) =>
      item({ id: 40 + n, name: `Ring ${n}`, inventory_type: { type: 'FINGER' } }, [['HASTE_RATING', 100 - n]]),
    );
    const helms = [1, 2, 3, 4].map((n) =>
      item({ id: 50 + n, name: `Helm ${n}`, item_subclass: { name: 'Cloth' } }, [['HASTE_RATING', 100 - n]]),
    );
    const list = deriveBisList(spec, candidatesFrom([...rings, ...helms]), seasonConfig, 'midnight-s2');
    expect(list.entries.filter((e) => e.slot === 'finger')).toHaveLength(3);
    expect(list.entries.filter((e) => e.slot === 'head')).toHaveLength(2);
  });

  it('marks tier-eligible slots as catalystable and other slots not', () => {
    const chest = item({ id: 60, item_subclass: { name: 'Cloth' }, inventory_type: { type: 'CHEST' } }, [['HASTE_RATING', 10]]);
    const neck = item({ id: 61, inventory_type: { type: 'NECK' } }, [['HASTE_RATING', 10]]);
    const list = deriveBisList(spec, candidatesFrom([chest, neck]), seasonConfig, 'midnight-s2');
    expect(list.entries.find((e) => e.slot === 'chest')!.catalystable).toBe(true);
    expect(list.entries.find((e) => e.slot === 'neck')!.catalystable).toBe(false);
  });
});

describe('normaliseName', () => {
  /**
   * seasonConfig says "King's Rest"; the journal says "Kings' Rest". An exact
   * match drops that dungeon's whole loot table while still looking like a
   * clean run.
   */
  it('matches across apostrophe placement and style', () => {
    expect(normaliseName("King's Rest")).toBe(normaliseName("Kings' Rest"));
    expect(normaliseName('Ula’tek')).toBe(normaliseName("Ula'tek"));
  });
});

describe('spec catalogue', () => {
  it('covers all 40 playable specs with no duplicates', () => {
    expect(SPEC_CATALOGUE).toHaveLength(40);
    const slugs = new Set(SPEC_CATALOGUE.map((s) => `${s.class}-${s.spec}`));
    expect(slugs.size).toBe(40);
  });

  it('gives every spec a complete four-stat priority', () => {
    for (const spec of SPEC_CATALOGUE) {
      expect(new Set(spec.statPriority).size, `${spec.class} ${spec.spec}`).toBe(4);
    }
  });
});
