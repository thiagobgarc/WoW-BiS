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
import { SPEC_CATALOGUE, findSpec, specSlug } from './specCatalogue';
import { loadoutsFor } from './weaponProficiency';

/** [type, value, negated?] — negated mirrors Blizzard's greyed-out stats. */
type StatTuple = [string, number] | [string, number, boolean];

function item(overrides: Partial<IngestItem> & { id: number }, stats: StatTuple[] = []): IngestItem {
  const { preview_item: previewOverride, ...rest } = overrides;
  return {
    name: `Item ${overrides.id}`,
    level: 219,
    quality: { type: 'EPIC' },
    inventory_type: { type: 'HEAD' },
    ...rest,
    preview_item: {
      stats: stats.map(([type, value, negated]) => ({ type: { type }, value, ...(negated ? { is_negated: true } : {}) })),
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

  /**
   * Blizzard renders static tooltips for an intellect viewer, so an agility
   * dagger arrives with AGILITY negated and nothing else. It still IS an
   * agility dagger; dropping the stat made it look primary-less.
   */
  it('keeps negated primaries as options while excluding them from budget', () => {
    const dagger = parseItemStats(item({ id: 8 }, [['AGILITY', 120, true], ['HASTE_RATING', 40]]));
    expect(dagger.primary).toEqual({});
    expect(dagger.primaryOptions).toEqual(['agility']);

    const shield = parseItemStats(item({ id: 9 }, [['INTELLECT', 90], ['STRENGTH', 90, true]]));
    expect(shield.primaryOptions.sort()).toEqual(['intellect', 'strength']);
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
  const ret = findSpec('Paladin', 'Retribution')!; // plate, strength
  const arcane = findSpec('Mage', 'Arcane')!; // cloth, intellect
  const elemental = findSpec('Shaman', 'Elemental')!; // mail, intellect
  const enhancement = findSpec('Shaman', 'Enhancement')!; // mail, agility

  it('gates armor on armor class', () => {
    const plate = item({ id: 15, item_subclass: { name: 'Plate' } });
    expect(isUsableBySpec(plate, ret)).toBe(true);
    expect(isUsableBySpec(plate, arcane)).toBe(false);
  });

  it('lets jewellery through, which carries no armor class or primary', () => {
    const ring = item({ id: 16, inventory_type: { type: 'FINGER' }, item_subclass: { name: 'Miscellaneous' } });
    expect(isUsableBySpec(ring, ret)).toBe(true);
    expect(isUsableBySpec(ring, arcane)).toBe(true);
  });

  /** Regression: Enhancement was offered Elemental's intellect staff. */
  it('gates weapons on primary stat, so same-armor specs do not share them', () => {
    const staff = item({ id: 18, inventory_type: { type: 'TWOHWEAPON' }, item_subclass: { name: 'Staff' } }, [
      ['INTELLECT', 200],
      ['HASTE_RATING', 80],
    ]);
    expect(isUsableBySpec(staff, elemental)).toBe(true);
    expect(isUsableBySpec(staff, enhancement)).toBe(false);
  });

  it('reads negated primaries when gating, as Blizzard reports agility and strength weapons', () => {
    const fist = item({ id: 19, inventory_type: { type: 'WEAPON' }, item_subclass: { name: 'Fist Weapon' } }, [
      ['AGILITY', 120, true],
      ['HASTE_RATING', 40],
    ]);
    expect(isUsableBySpec(fist, enhancement)).toBe(true);
    expect(isUsableBySpec(fist, elemental)).toBe(false);
  });

  it('gates off-hands and trinkets on primary stat too', () => {
    const shield = item({ id: 20, inventory_type: { type: 'SHIELD' }, item_subclass: { name: 'Shield' } }, [
      ['INTELLECT', 90],
      ['STRENGTH', 90, true],
    ]);
    expect(isUsableBySpec(shield, elemental)).toBe(true);
    expect(isUsableBySpec(shield, ret)).toBe(true);
    expect(isUsableBySpec(shield, enhancement)).toBe(false);

    const intTrinket = item({ id: 21, inventory_type: { type: 'TRINKET' } }, [['INTELLECT', 150]]);
    expect(isUsableBySpec(intTrinket, ret)).toBe(false);
  });

  /** Regression: once primary was enforced, Enhancement got bows and guns. */
  it('rejects weapon types the class cannot equip, even on the right primary', () => {
    const bow = item({ id: 23, inventory_type: { type: 'RANGED' }, item_subclass: { name: 'Bow' } }, [['AGILITY', 200, true]]);
    expect(isUsableBySpec(bow, enhancement)).toBe(false);
    expect(isUsableBySpec(bow, findSpec('Hunter', 'Marksmanship')!)).toBe(true);

    const sword = item({ id: 24, inventory_type: { type: 'WEAPON' }, item_subclass: { name: 'Sword' } }, [['INTELLECT', 120]]);
    expect(isUsableBySpec(sword, elemental)).toBe(false);
    expect(isUsableBySpec(sword, arcane)).toBe(true);
  });

  it('enforces one-hand-only proficiencies', () => {
    const twoHandSword = item({ id: 25, inventory_type: { type: 'TWOHWEAPON' }, item_subclass: { name: 'Sword' } }, [['AGILITY', 200, true]]);
    expect(isUsableBySpec(twoHandSword, findSpec('Rogue', 'Outlaw')!)).toBe(false);
    expect(isUsableBySpec(twoHandSword, findSpec('Hunter', 'Survival')!)).toBe(true);
  });

  /** A class missing from the proficiency table would silently lose every weapon. */
  it('leaves every spec at least one weapon type', () => {
    const weapons = [
      item({ id: 28, inventory_type: { type: 'WEAPON' }, item_subclass: { name: 'Sword' } }),
      item({ id: 29, inventory_type: { type: 'TWOHWEAPON' }, item_subclass: { name: 'Staff' } }),
      item({ id: 30, inventory_type: { type: 'TWOHWEAPON' }, item_subclass: { name: 'Polearm' } }),
      item({ id: 31, inventory_type: { type: 'RANGED' }, item_subclass: { name: 'Bow' } }),
      item({ id: 32, inventory_type: { type: 'WEAPON' }, item_subclass: { name: 'Fist Weapon' } }),
    ];
    for (const spec of SPEC_CATALOGUE) {
      expect(weapons.some((w) => isUsableBySpec(w, spec)), `${spec.class} ${spec.spec}`).toBe(true);
    }
  });

  it('lets a trinket with no primary stat through for every spec', () => {
    const proc = item({ id: 22, inventory_type: { type: 'TRINKET' } }, [['VERSATILITY', 60]]);
    for (const spec of [ret, arcane, elemental, enhancement]) expect(isUsableBySpec(proc, spec)).toBe(true);
  });

  /**
   * Regression. Armor has an adaptive primary stat and the static item
   * endpoint reports one representative allocation — this season's plate
   * reports INTELLECT. Filtering on primary stat excluded every strength and
   * agility spec from all armor and left them with 4 slots of 14.
   */
  it('does not filter plate reporting INTELLECT away from a strength spec', () => {
    const plate = item({ id: 17, item_subclass: { name: 'Plate' } }, [['INTELLECT', 65], ['CRIT_RATING', 31]]);
    expect(isUsableBySpec(plate, ret)).toBe(true);
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

describe('weapon loadouts', () => {
  const weapon = (id: number, type: string, subclass: string, stats: StatTuple[]) =>
    item({ id, name: `${subclass} ${id}`, inventory_type: { type }, item_subclass: { name: subclass } }, stats);

  const agi1h = (id: number, sub = 'Fist Weapon') => weapon(id, 'WEAPON', sub, [['AGILITY', 100, true], ['HASTE_RATING', 50]]);
  const str2h = (id: number, sub = 'Axe') => weapon(id, 'TWOHWEAPON', sub, [['STRENGTH', 200, true], ['MASTERY_RATING', 100]]);
  const shield = (id: number) => weapon(id, 'SHIELD', 'Shield', [['INTELLECT', 90], ['STRENGTH', 90, true], ['HASTE_RATING', 40]]);

  function derive(cls: string, specName: string, items: IngestItem[]) {
    const entries: LootEntry[] = items.map((i) => ({ itemId: i.id, itemName: i.name, contentType: 'raid', instance: 'R', boss: 'B' }));
    const candidates = buildCandidates(entries, new Map(items.map((i) => [i.id, i])), seasonConfig);
    const list = deriveBisList(findSpec(cls, specName)!, candidates, seasonConfig, 'midnight-s2');
    const names = (slot: string) => list.entries.filter((e) => e.slot === slot).map((e) => e.itemName);
    return { main: names('main_hand'), off: names('off_hand') };
  }

  it('gives a dual-wield spec a second weapon in the off hand, never the same item', () => {
    const { main, off } = derive('Shaman', 'Enhancement', [agi1h(40), agi1h(41, 'Axe')]);
    expect(main).toHaveLength(2);
    expect(off).toHaveLength(1);
    expect(off[0]).not.toBe(main[0]);
  });

  it('never offers a two-hander spec a shield or off-hand', () => {
    const { main, off } = derive('Paladin', 'Retribution', [str2h(42), shield(43), weapon(44, 'WEAPON', 'Sword', [['STRENGTH', 100, true]])]);
    expect(main).toEqual(['Axe 42']);
    expect(off).toEqual([]);
  });

  it('gives a tank a one-hander and a shield, not a two-hander', () => {
    const sword = weapon(45, 'WEAPON', 'Sword', [['STRENGTH', 100, true], ['HASTE_RATING', 50]]);
    const { main, off } = derive('Warrior', 'Protection', [str2h(46), sword, shield(47)]);
    expect(main).toEqual(['Sword 45']);
    expect(off).toEqual(['Shield 47']);
  });

  it('lists no off-hand when a caster staff beats the one-hand setup', () => {
    const staff = weapon(48, 'TWOHWEAPON', 'Staff', [['INTELLECT', 200], ['HASTE_RATING', 100]]); // Fire's top stat
    const dagger = weapon(49, 'WEAPON', 'Dagger', [['INTELLECT', 100], ['CRIT_RATING', 50]]); // Fire's worst stat
    const frill = weapon(50, 'HOLDABLE', 'Miscellaneous', [['INTELLECT', 100], ['CRIT_RATING', 50]]);
    const { main, off } = derive('Mage', 'Fire', [staff, dagger, frill]);
    expect(main[0]).toBe('Staff 48');
    expect(off).toEqual([]);
  });

  it('splits Hunter specs between ranged and melee weapons', () => {
    const polearm = weapon(51, 'TWOHWEAPON', 'Polearm', [['AGILITY', 200, true]]);
    const gun = weapon(52, 'RANGEDRIGHT', 'Gun', [['AGILITY', 200, true]]);
    expect(derive('Hunter', 'Survival', [polearm, gun]).main).toEqual(['Polearm 51']);
    expect(derive('Hunter', 'Beast Mastery', [polearm, gun]).main).toEqual(['Gun 52']);
  });

  it("limits Fury's Titan's Grip pair to axes, maces and swords", () => {
    const { main, off } = derive('Warrior', 'Fury', [str2h(53, 'Polearm'), str2h(54, 'Axe'), str2h(55, 'Sword')]);
    expect([...main, ...off]).not.toContain('Polearm 53');
    expect(off).toHaveLength(1);
  });

  it('has a loadout for every catalogue spec', () => {
    for (const spec of SPEC_CATALOGUE) expect(() => loadoutsFor(specSlug(spec.class, spec.spec))).not.toThrow();
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
