import { describe, expect, it } from 'vitest';
import { compareGear } from './compareGear';
import type { BisEntry } from './types';
import type { DomainItem, EquipmentBySlot, EquipmentSlot } from '@/lib/blizzard/domain';

function item(overrides: Partial<DomainItem> & { slot: EquipmentSlot; itemId: number; itemLevel: number }): DomainItem {
  return {
    name: `Item ${overrides.itemId}`,
    quality: 'epic',
    iconUrl: null,
    isTierPiece: false,
    isEmbellishment: false,
    sockets: [],
    enchantText: null,
    wowheadUrl: `https://www.wowhead.com/item=${overrides.itemId}`,
    bindingText: null,
    armorTypeLabel: null,
    armorLine: null,
    weaponLines: [],
    stats: [],
    procs: [],
    requiredLevelText: null,
    classesText: null,
    setInfo: null,
    ...overrides,
  };
}

function bisEntry(overrides: Partial<BisEntry> & Pick<BisEntry, 'slot' | 'rank' | 'itemId' | 'itemLevel'>): BisEntry {
  return {
    contentType: 'raid',
    itemName: `BiS ${overrides.itemId}`,
    source: { type: 'raid', instance: 'Nerub-ar Palace', boss: 'Queen Ansurek', difficulty: 'mythic' },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 100,
    ...overrides,
  };
}

// A minimal but complete list: every singular slot + a finger/trinket pool of 3 ranks each.
// These slot names are valid as both EquipmentSlot (physical) and BisSlot (target list) —
// only finger/trinket differ between the two, and this list excludes them.
const SINGULAR_SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'main_hand', 'off_hand'] as const satisfies readonly EquipmentSlot[];

function buildBisList(): BisEntry[] {
  const list: BisEntry[] = SINGULAR_SLOTS.map((slot, i) =>
    bisEntry({ slot, rank: 1, itemId: 1000 + i, itemLevel: 502, tierPiece: ['head', 'shoulder', 'chest', 'hands', 'legs'].includes(slot) }),
  );
  list.push(
    bisEntry({ slot: 'finger', rank: 1, itemId: 2001, itemLevel: 502 }),
    bisEntry({ slot: 'finger', rank: 2, itemId: 2002, itemLevel: 502 }),
    bisEntry({ slot: 'finger', rank: 3, itemId: 2003, itemLevel: 489 }),
    bisEntry({ slot: 'trinket', rank: 1, itemId: 3001, itemLevel: 502 }),
    bisEntry({ slot: 'trinket', rank: 2, itemId: 3002, itemLevel: 502 }),
  );
  return list;
}

describe('compareGear', () => {
  it('reports full BiS when equipped matches every rank-1 (and rank-2 pair) target exactly', () => {
    const bisList = buildBisList();
    const equipped: EquipmentBySlot = {};
    SINGULAR_SLOTS.forEach((slot, i) => {
      equipped[slot] = item({ slot, itemId: 1000 + i, itemLevel: 502 });
    });
    equipped.finger_1 = item({ slot: 'finger_1', itemId: 2001, itemLevel: 502 });
    equipped.finger_2 = item({ slot: 'finger_2', itemId: 2002, itemLevel: 502 });
    equipped.trinket_1 = item({ slot: 'trinket_1', itemId: 3001, itemLevel: 502 });
    equipped.trinket_2 = item({ slot: 'trinket_2', itemId: 3002, itemLevel: 502 });

    const result = compareGear(equipped, bisList, 'raid');

    expect(result.rows.every((r) => r.severity === 'bis')).toBe(true);
    expect(result.bisSlotsCount).toBe(result.totalSlots);
    expect(result.totalSlots).toBe(16);
    expect(result.currentIlvl).toBe(result.theoreticalMaxIlvl);
  });

  it('reports every slot as a major gap for a fully empty character', () => {
    const result = compareGear({}, buildBisList(), 'raid');

    expect(result.rows.every((r) => r.severity === 'major-gap')).toBe(true);
    expect(result.bisSlotsCount).toBe(0);
    expect(result.currentIlvl).toBe(0);
    expect(result.theoreticalMaxIlvl).toBeGreaterThan(0);
  });

  it('flags a single missing slot without affecting the rest', () => {
    const bisList = buildBisList();
    const equipped: EquipmentBySlot = {};
    SINGULAR_SLOTS.forEach((slot, i) => {
      if (slot === 'waist') return; // leave this one empty
      equipped[slot] = item({ slot, itemId: 1000 + i, itemLevel: 502 });
    });

    const result = compareGear(equipped, bisList, 'raid');
    const waistRow = result.rows.find((r) => r.bisSlot === 'waist');

    expect(waistRow?.severity).toBe('major-gap');
    expect(waistRow?.equipped).toBeNull();
    expect(result.rows.filter((r) => r.bisSlot !== 'waist' && (SINGULAR_SLOTS as readonly string[]).includes(r.bisSlot))).toSatisfy(
      (rows: typeof result.rows) => rows.every((r) => r.severity === 'bis'),
    );
  });

  it('propagates the tierPiece flag onto the comparison target', () => {
    const result = compareGear({}, buildBisList(), 'raid');
    const headRow = result.rows.find((r) => r.bisSlot === 'head');
    const neckRow = result.rows.find((r) => r.bisSlot === 'neck');

    expect(headRow?.target?.tierPiece).toBe(true);
    expect(neckRow?.target?.tierPiece).toBe(false);
  });

  it('assigns duplicate rings optimally instead of naively matching slot 1 to rank 1', () => {
    const bisList = buildBisList();
    const equipped: EquipmentBySlot = {
      // Player holds BiS rank 2 in finger_1, and something off-list in finger_2.
      finger_1: item({ slot: 'finger_1', itemId: 2002, itemLevel: 502 }),
      finger_2: item({ slot: 'finger_2', itemId: 9999, itemLevel: 470 }),
    };

    const result = compareGear(equipped, bisList, 'raid');
    const finger1Row = result.rows.find((r) => r.physicalSlot === 'finger_1')!;
    const finger2Row = result.rows.find((r) => r.physicalSlot === 'finger_2')!;

    // finger_1 should be credited as a BiS match against rank 2, not told it's missing rank 1.
    expect(finger1Row.severity).toBe('bis');
    expect(finger1Row.target?.itemId).toBe(2002);
    // finger_2 should be the one targeting the remaining rank (rank 1).
    expect(finger2Row.target?.itemId).toBe(2001);
    expect(finger2Row.severity).not.toBe('bis');
  });

  it('recognizes a ring match regardless of which physical slot it sits in', () => {
    const bisList = buildBisList();
    const equipped: EquipmentBySlot = {
      finger_1: item({ slot: 'finger_1', itemId: 9999, itemLevel: 470 }),
      finger_2: item({ slot: 'finger_2', itemId: 2001, itemLevel: 502 }), // rank 1, but in slot 2
    };

    const result = compareGear(equipped, bisList, 'raid');
    const finger2Row = result.rows.find((r) => r.physicalSlot === 'finger_2')!;

    expect(finger2Row.isMatch).toBe(true);
    expect(finger2Row.target?.itemId).toBe(2001);
  });

  it('filters by content type', () => {
    const bisList: BisEntry[] = [
      bisEntry({ slot: 'head', rank: 1, itemId: 1, itemLevel: 502, contentType: 'raid' }),
      bisEntry({ slot: 'head', rank: 1, itemId: 2, itemLevel: 489, contentType: 'mythic-plus' }),
    ];

    const raidResult = compareGear({}, bisList, 'raid');
    const mplusResult = compareGear({}, bisList, 'mythic-plus');

    expect(raidResult.rows[0]?.target?.itemId).toBe(1);
    expect(mplusResult.rows[0]?.target?.itemId).toBe(2);
  });
});
