import { EQUIPMENT_SLOTS, type DomainItem } from '@mythos/core/character';

import { missingFromPaperDoll, PAPER_DOLL_SLOTS, slotTileLabel } from './slots';

function item(overrides: Partial<DomainItem> = {}): DomainItem {
  return {
    slot: 'head',
    itemId: 1,
    name: 'Crown of the Abyss',
    quality: 'epic',
    itemLevel: 636,
    iconUrl: null,
    isTierPiece: false,
    isEmbellishment: false,
    sockets: [],
    enchantText: null,
    wowheadUrl: 'https://www.wowhead.com/item=1',
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

describe('PAPER_DOLL_SLOTS', () => {
  it('renders every slot the contract defines', () => {
    // The grid is hand-ordered for readability, so it can't be derived from
    // EQUIPMENT_SLOTS — which means a slot added to the contract would
    // otherwise just never appear, with nothing failing.
    expect(missingFromPaperDoll()).toEqual([]);
    expect(PAPER_DOLL_SLOTS).toHaveLength(EQUIPMENT_SLOTS.length);
  });

  it('has no duplicates', () => {
    expect(new Set(PAPER_DOLL_SLOTS).size).toBe(PAPER_DOLL_SLOTS.length);
  });
});

describe('slotTileLabel', () => {
  it('describes an empty slot', () => {
    expect(slotTileLabel('main_hand', null)).toBe('Main Hand: empty');
  });

  it('leads with the slot, the name and the item level', () => {
    expect(slotTileLabel('head', item())).toBe('Head: Crown of the Abyss, item level 636');
  });

  it('announces tier and embellishment, which the tile shows as chips', () => {
    const label = slotTileLabel('chest', item({ isTierPiece: true, isEmbellishment: true }));
    expect(label).toContain('tier piece');
    expect(label).toContain('embellished');
  });

  it('counts empty sockets, because an empty socket is a to-do item', () => {
    const sockets = [{ filled: true, gemName: 'Ruby' }, { filled: false }, { filled: false }];
    expect(slotTileLabel('neck', item({ sockets }))).toContain('2 empty sockets');
  });

  it('says "socket" singular for one', () => {
    const label = slotTileLabel('neck', item({ sockets: [{ filled: false }] }));
    expect(label).toContain('1 empty socket');
    expect(label).not.toContain('sockets');
  });

  it('stays quiet about sockets that are all filled', () => {
    const sockets = [{ filled: true, gemName: 'Ruby' }];
    expect(slotTileLabel('neck', item({ sockets }))).not.toContain('socket');
  });
});
