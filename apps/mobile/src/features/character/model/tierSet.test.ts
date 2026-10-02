import type { DomainItem, EquipmentBySlot, EquipmentSlot } from '@mythos/core/character';

import { tierSetSummary, TIER_SLOTS } from './tierSet';

function piece(slot: EquipmentSlot, isTierPiece: boolean): DomainItem {
  return {
    slot,
    itemId: 1,
    name: slot,
    quality: 'epic',
    itemLevel: 636,
    iconUrl: null,
    isTierPiece,
    isEmbellishment: false,
    sockets: [],
    enchantText: null,
    wowheadUrl: '',
    bindingText: null,
    armorTypeLabel: null,
    armorLine: null,
    weaponLines: [],
    stats: [],
    procs: [],
    requiredLevelText: null,
    classesText: null,
    setInfo: null,
  };
}

/** `count` tier pieces, plus a non-tier item in every remaining tier slot. */
function equipmentWithTier(count: number): EquipmentBySlot {
  return Object.fromEntries(
    TIER_SLOTS.map((slot, index) => [slot, piece(slot, index < count)]),
  ) as EquipmentBySlot;
}

describe('tierSetSummary', () => {
  it('counts only pieces flagged as tier', () => {
    expect(tierSetSummary(equipmentWithTier(3)).owned).toBe(3);
  });

  it('ignores tier pieces in slots a set does not occupy', () => {
    const equipment = { ...equipmentWithTier(0), back: piece('back', true) } as EquipmentBySlot;
    expect(tierSetSummary(equipment).owned).toBe(0);
  });

  it.each([
    [0, 0, 'no bonus active'],
    [1, 0, 'no bonus active'],
    [2, 2, '2pc active'],
    // The thresholds are 2 and 4 — a third piece grants nothing new, which
    // is the whole reason this isn't `owned` rendered directly.
    [3, 2, '2pc active'],
    [4, 4, '4pc active'],
    [5, 4, '4pc active'],
  ])('%i pieces gives a %ipc bonus', (owned, bonus, label) => {
    const summary = tierSetSummary(equipmentWithTier(owned));
    expect(summary.bonus).toBe(bonus);
    expect(summary.label).toBe(label);
  });

  it('reports the total from TIER_SLOTS rather than a literal', () => {
    expect(tierSetSummary({}).total).toBe(TIER_SLOTS.length);
  });

  it('treats missing slots as not equipped', () => {
    expect(tierSetSummary({})).toMatchObject({ owned: 0, bonus: 0 });
  });
});
