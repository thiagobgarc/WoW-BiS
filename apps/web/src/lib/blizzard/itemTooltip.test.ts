import { describe, expect, it } from 'vitest';
import { toBisItemTooltip } from './itemTooltip';
import { ItemTooltipSourceSchema } from './schemas';

const stat = (type: string, value: number, extra: Record<string, unknown> = {}) => ({ type: { type }, value, ...extra });

// Trimmed from a real /data/wow/item/271474 response (Frost DK tier helm).
const tierHelm = ItemTooltipSourceSchema.parse({
  id: 271474,
  preview_item: {
    level: { value: 219, display_string: 'Item Level 219' },
    item_class: { id: 4, name: 'Armor' },
    item_subclass: { name: 'Plate' },
    inventory_type: { type: 'HEAD', name: 'Head' },
    binding: { type: 'ON_ACQUIRE', name: 'Binds when picked up' },
    stats: [
      stat('INTELLECT', 65),
      stat('STRENGTH', 65, { is_negated: true }),
      stat('STAMINA', 1005),
      stat('CRIT_RATING', 74, { is_equip_bonus: true }),
      stat('MASTERY_RATING', 33, { is_equip_bonus: true }),
    ],
    set: { item_set: { id: 2055, name: "Baleful Grave-Knight's Crucible" } },
    requirements: {
      level: { value: 90, display_string: 'Requires Level 90' },
      playable_classes: { display_string: 'Classes: Death Knight' },
    },
  },
});

// Trimmed from /data/wow/item/268202 (a one-hand axe with a proc).
const weapon = ItemTooltipSourceSchema.parse({
  id: 268202,
  preview_item: {
    level: { value: 219 },
    item_class: { id: 2, name: 'Weapon' },
    item_subclass: { name: 'Axe' },
    inventory_type: { type: 'WEAPON', name: 'One-Hand' },
    name_description: { display_string: 'Venomcursed', color: { r: 0, g: 191, b: 13, a: 1 } },
    unique_equipped: 'Unique-Equipped',
    weapon: { attack_speed: { value: 2600, display_string: 'Speed 2.60' } },
    stats: [stat('STRENGTH', 32, { is_negated: true }), stat('STAMINA', 502), stat('HASTE_RATING', 54)],
    spells: [{ description: 'Equip: Your spells have a chance to increase your Haste.\r\n\r\nSecond paragraph.' }],
  },
});

describe('toBisItemTooltip', () => {
  it('resolves a flexible primary stat to the spec it is shown for', () => {
    expect(toBisItemTooltip(tierHelm, 'strength').primaryStat).toBe('Strength');
  });

  it('lists every primary stat when the spec does not settle it', () => {
    expect(toBisItemTooltip(tierHelm).primaryStat).toBe('Intellect or Strength');
  });

  it('splits secondaries by share, largest first, ignoring stamina', () => {
    expect(toBisItemTooltip(tierHelm, 'strength').secondaries).toEqual([
      { label: 'Critical Strike', share: 69 },
      { label: 'Mastery', share: 31 },
    ]);
  });

  it('rounds shares so they always sum to 100', () => {
    const even = ItemTooltipSourceSchema.parse({
      id: 1,
      preview_item: { stats: [stat('CRIT_RATING', 1), stat('HASTE_RATING', 1), stat('MASTERY_RATING', 1)] },
    });
    const shares = toBisItemTooltip(even).secondaries.map((s) => s.share);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('keeps the base item level, armor type and set membership', () => {
    const t = toBisItemTooltip(tierHelm, 'strength');
    expect(t.baseItemLevel).toBe(219);
    expect(t).toMatchObject({ slotText: 'Head', typeText: 'Plate', setName: "Baleful Grave-Knight's Crucible" });
    expect(t.classesText).toBe('Classes: Death Knight');
  });

  it('reads weapon type, speed, name description and effects', () => {
    const t = toBisItemTooltip(weapon, 'strength');
    expect(t).toMatchObject({ slotText: 'One-Hand', typeText: 'Axe', weaponSpeed: 'Speed 2.60', uniqueText: 'Unique-Equipped' });
    expect(t.nameDescription).toEqual({ text: 'Venomcursed', color: 'rgba(0, 191, 13, 1)' });
    expect(t.effects).toEqual(['Equip: Your spells have a chance to increase your Haste.\n\nSecond paragraph.']);
    expect(t.secondaries).toEqual([{ label: 'Haste', share: 100 }]);
  });

  it('gives no type label to trinkets and rings', () => {
    const ring = ItemTooltipSourceSchema.parse({
      id: 2,
      preview_item: { item_class: { id: 4, name: 'Armor' }, item_subclass: { name: 'Miscellaneous' }, inventory_type: { type: 'FINGER', name: 'Finger' } },
    });
    expect(toBisItemTooltip(ring).typeText).toBeNull();
  });
});
