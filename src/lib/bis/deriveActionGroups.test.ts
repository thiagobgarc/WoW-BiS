import { describe, expect, it } from 'vitest';
import { deriveActionGroups } from './deriveActionGroups';
import type { ComparisonRow, Target } from './compareGear';
import type { DomainItem, EquipmentBySlot } from '@/lib/blizzard/domain';

function target(overrides: Partial<Target> & Pick<Target, 'itemId' | 'itemName' | 'itemLevel' | 'source'>): Target {
  return { rank: 1, tierPiece: false, catalystable: false, ...overrides };
}

function row(overrides: Partial<ComparisonRow> & Pick<ComparisonRow, 'bisSlot' | 'physicalSlot'>): ComparisonRow {
  return { equipped: null, target: null, alternatives: [], severity: 'upgrade', ilvlDelta: 10, isMatch: false, ...overrides };
}

describe('deriveActionGroups', () => {
  it('groups raid targets by boss and counts how many upgrades each drops', () => {
    const rows: ComparisonRow[] = [
      row({ bisSlot: 'head', physicalSlot: 'head', target: target({ itemId: 1, itemName: 'Crown', itemLevel: 515, source: { type: 'raid', boss: 'Queen Ansurek', instance: 'Nerub-ar Palace', difficulty: 'mythic' } }) }),
      row({ bisSlot: 'chest', physicalSlot: 'chest', target: target({ itemId: 2, itemName: 'Vest', itemLevel: 515, source: { type: 'raid', boss: 'Queen Ansurek', instance: 'Nerub-ar Palace', difficulty: 'mythic' } }) }),
      row({ bisSlot: 'neck', physicalSlot: 'neck', target: target({ itemId: 3, itemName: 'Chain', itemLevel: 515, source: { type: 'raid', boss: 'Ulgrax the Defiler', instance: 'Nerub-ar Palace', difficulty: 'mythic' } }) }),
    ];

    const groups = deriveActionGroups(rows, {});

    expect(groups.raidTargets[0]?.boss).toBe('Queen Ansurek');
    expect(groups.raidTargets[0]?.slots).toHaveLength(2);
    expect(groups.raidTargets[1]?.boss).toBe('Ulgrax the Defiler');
  });

  it('excludes BiS-matched rows from every actionable grouping', () => {
    const rows: ComparisonRow[] = [
      row({
        bisSlot: 'head',
        physicalSlot: 'head',
        severity: 'bis',
        isMatch: true,
        target: target({ itemId: 1, itemName: 'Crown', itemLevel: 515, source: { type: 'raid', boss: 'Queen Ansurek', instance: 'Nerub-ar Palace' } }),
      }),
    ];

    const groups = deriveActionGroups(rows, {});
    expect(groups.raidTargets).toHaveLength(0);
  });

  it('separates crafted and catalyst targets into their own groups', () => {
    const rows: ComparisonRow[] = [
      row({ bisSlot: 'wrist', physicalSlot: 'wrist', target: target({ itemId: 1, itemName: 'Bindings', itemLevel: 509, source: { type: 'crafted', craftQuality: 5 } }) }),
      row({ bisSlot: 'shoulder', physicalSlot: 'shoulder', target: target({ itemId: 2, itemName: 'Mantle', itemLevel: 502, source: { type: 'catalyst' } }) }),
    ];

    const groups = deriveActionGroups(rows, {});
    expect(groups.craftTargets).toEqual([{ slot: 'Wrist', itemName: 'Bindings', craftQuality: 5 }]);
    expect(groups.catalystTargets).toEqual([{ slot: 'Shoulder', itemName: 'Mantle' }]);
  });

  it('flags missing enchants and empty sockets as quick wins', () => {
    const equipment: EquipmentBySlot = {
      main_hand: itemFixture({ slot: 'main_hand', itemId: 1, enchantText: null }),
      chest: itemFixture({ slot: 'chest', itemId: 2, enchantText: 'Enchanted: Stamina' }),
      wrist: itemFixture({ slot: 'wrist', itemId: 3, sockets: [{ filled: false }] }),
    };

    const groups = deriveActionGroups([], equipment);

    expect(groups.quickWins.some((w) => w.type === 'enchant' && w.slot === 'Main Hand')).toBe(true);
    expect(groups.quickWins.some((w) => w.type === 'enchant' && w.slot === 'Chest')).toBe(false);
    expect(groups.quickWins.some((w) => w.type === 'socket' && w.slot === 'Wrist')).toBe(true);
  });

  it('flags an embellishable slot without an embellishment as a quick win', () => {
    const equipment: EquipmentBySlot = {
      shoulder: itemFixture({ slot: 'shoulder', itemId: 1, isEmbellishment: false }),
    };
    const groups = deriveActionGroups([], equipment);
    expect(groups.quickWins.some((w) => w.type === 'embellishment' && w.slot === 'Shoulder')).toBe(true);
  });
});

function itemFixture(overrides: Partial<DomainItem> & { slot: DomainItem['slot']; itemId: number }): DomainItem {
  return {
    name: `Item ${overrides.itemId}`,
    quality: 'epic',
    itemLevel: 500,
    iconUrl: null,
    isTierPiece: false,
    isEmbellishment: false,
    sockets: [],
    enchantText: null,
    wowheadUrl: '',
    ...overrides,
  };
}
