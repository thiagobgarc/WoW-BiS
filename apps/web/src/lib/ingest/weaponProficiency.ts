/**
 * Which weapons each class can equip. Like stat priority, Blizzard publishes
 * no endpoint for this, but unlike stat priority it is a fixed game rule, not
 * theorycraft, so it is safe to hand-maintain.
 *
 * Without it, primary stat was the only weapon gate, and an Enhancement
 * Shaman (agility) was offered a bow, a gun and a crossbow — agility weapons
 * a Shaman cannot equip.
 *
 * Proficiency says what a class CAN hold; LOADOUTS below says how each spec
 * actually fills its hands (two-hander, dual wield, sword and board, ...).
 *
 * Keys are Blizzard's item_subclass names. They do not distinguish one-hand
 * from two-hand ("Axe" is both), so handedness comes from inventory type.
 * A subclass missing from KNOWN_WEAPON_SUBCLASSES is reported by the ingest
 * rather than silently filtered, because over-filtering fails invisibly.
 */
import type { IngestItem } from '@/lib/blizzard/schemas';
import type { SpecProfile } from './specCatalogue';

type Hands = 'one' | 'two' | 'both';

/** Subclass -> which handedness the class may wield it in. */
type Proficiency = Partial<Record<string, Hands>>;

const CASTER_OFF_HAND = { Miscellaneous: 'one' } as const; // "Held In Off-hand"

const BY_CLASS: Record<string, Proficiency> = {
  'Death Knight': { Axe: 'both', Mace: 'both', Sword: 'both', Polearm: 'two' },
  'Demon Hunter': { Warglaives: 'one', Axe: 'one', Sword: 'one', 'Fist Weapon': 'one' },
  Druid: { Dagger: 'one', 'Fist Weapon': 'one', Mace: 'both', Polearm: 'two', Staff: 'two', ...CASTER_OFF_HAND },
  Evoker: { Dagger: 'one', 'Fist Weapon': 'one', Axe: 'both', Mace: 'both', Sword: 'both', Staff: 'two', ...CASTER_OFF_HAND },
  Hunter: {
    Bow: 'two', Crossbow: 'two', Gun: 'two',
    Axe: 'both', Sword: 'both', Polearm: 'two', Staff: 'two', Dagger: 'one', 'Fist Weapon': 'one',
  },
  Mage: { Dagger: 'one', Sword: 'one', Staff: 'two', Wand: 'one', ...CASTER_OFF_HAND },
  Monk: { 'Fist Weapon': 'one', Axe: 'one', Mace: 'one', Sword: 'one', Polearm: 'two', Staff: 'two', ...CASTER_OFF_HAND },
  Paladin: { Axe: 'both', Mace: 'both', Sword: 'both', Polearm: 'two', Shield: 'one', ...CASTER_OFF_HAND },
  Priest: { Dagger: 'one', Mace: 'one', Staff: 'two', Wand: 'one', ...CASTER_OFF_HAND },
  Rogue: { Dagger: 'one', 'Fist Weapon': 'one', Axe: 'one', Mace: 'one', Sword: 'one' },
  Shaman: { Dagger: 'one', 'Fist Weapon': 'one', Axe: 'both', Mace: 'both', Staff: 'two', Shield: 'one', ...CASTER_OFF_HAND },
  Warlock: { Dagger: 'one', Sword: 'one', Staff: 'two', Wand: 'one', ...CASTER_OFF_HAND },
  Warrior: {
    Axe: 'both', Mace: 'both', Sword: 'both', Polearm: 'two', Staff: 'two', Dagger: 'one', 'Fist Weapon': 'one',
    Shield: 'one',
  },
};

export const KNOWN_WEAPON_SUBCLASSES: ReadonlySet<string> = new Set(
  Object.values(BY_CLASS).flatMap((p) => Object.keys(p)),
);

const TWO_HAND_TYPES = new Set(['TWOHWEAPON', 'RANGED', 'RANGEDRIGHT']);

function handsFor(item: IngestItem): 'one' | 'two' {
  return TWO_HAND_TYPES.has(item.inventory_type?.type ?? '') && item.item_subclass?.name !== 'Wand' ? 'two' : 'one';
}

/**
 * Whether the spec's class can equip this main-hand or off-hand item. Items
 * with an unknown subclass pass, so the ingest report — not a silent drop —
 * is what surfaces a new weapon type.
 */
export function canEquipWeapon(item: IngestItem, spec: Pick<SpecProfile, 'class'>): boolean {
  const subclass = item.item_subclass?.name;
  if (!subclass || !KNOWN_WEAPON_SUBCLASSES.has(subclass)) return true;

  const allowed = BY_CLASS[spec.class]?.[subclass];
  if (!allowed) return false;
  return allowed === 'both' || allowed === handsFor(item);
}

/**
 * What an item is, for building a weapon setup. Wands are one-handers that
 * only go in the main hand (they share RANGEDRIGHT with guns and crossbows).
 */
export type WeaponKind = 'one-hand' | 'two-hand' | 'ranged' | 'shield' | 'holdable';

export function weaponKind(item: IngestItem): WeaponKind | null {
  switch (item.inventory_type?.type) {
    case 'TWOHWEAPON':
      return 'two-hand';
    case 'RANGED':
    case 'RANGEDRIGHT':
      return item.item_subclass?.name === 'Wand' ? 'one-hand' : 'ranged';
    case 'WEAPON':
    case 'WEAPONMAINHAND':
    case 'WEAPONOFFHAND':
      return 'one-hand';
    case 'SHIELD':
      return 'shield';
    case 'HOLDABLE':
      return 'holdable';
    default:
      return null;
  }
}

/** Main-hand-only and off-hand-only one-handers exist; plain WEAPON goes in either. */
export function fitsHand(item: IngestItem, hand: 'main' | 'off'): boolean {
  const type = item.inventory_type?.type;
  if (hand === 'main') return type !== 'WEAPONOFFHAND' && type !== 'SHIELD' && type !== 'HOLDABLE';
  return type !== 'WEAPONMAINHAND' && type !== 'RANGEDRIGHT' && type !== 'RANGED';
}

/**
 * One way a spec can fill its hands. `off` absent means the setup has no
 * off-hand at all (a two-hander or a ranged weapon), which is what keeps a
 * staff-wielding caster from being told an empty off-hand is a gap.
 */
export interface Loadout {
  main: WeaponKind[];
  off?: WeaponKind[];
  /** Limits both hands to these subclasses (Titan's Grip). */
  subclasses?: string[];
}

const TWO_HANDER: Loadout = { main: ['two-hand'] };
const DUAL_WIELD: Loadout = { main: ['one-hand'], off: ['one-hand'] };
const SWORD_AND_BOARD: Loadout = { main: ['one-hand'], off: ['shield'] };
const RANGED_ONLY: Loadout = { main: ['ranged'] };
/** Casters: a staff, or a one-hander with a shield or held-in-off-hand item. */
const CASTER: Loadout[] = [{ main: ['two-hand'] }, { main: ['one-hand'], off: ['shield', 'holdable'] }];

/**
 * Setups per spec, in order of preference for a tie. The derivation picks
 * whichever fits the spec's stat priority best from the season's loot, and
 * lists only that setup's slots.
 */
const LOADOUTS: Record<string, Loadout[]> = {
  'death-knight-blood': [TWO_HANDER],
  'death-knight-frost': [DUAL_WIELD],
  'death-knight-unholy': [TWO_HANDER],
  'demon-hunter-devourer': [DUAL_WIELD],
  'demon-hunter-havoc': [DUAL_WIELD],
  'demon-hunter-vengeance': [DUAL_WIELD],
  'druid-balance': CASTER,
  // Feral and Guardian fight in forms; druids cannot dual wield, and there
  // are no agility off-hands, so a one-hander would just waste the slot.
  'druid-feral': [TWO_HANDER],
  'druid-guardian': [TWO_HANDER],
  'druid-restoration': CASTER,
  'evoker-augmentation': CASTER,
  'evoker-devastation': CASTER,
  'evoker-preservation': CASTER,
  'hunter-beast-mastery': [RANGED_ONLY],
  'hunter-marksmanship': [RANGED_ONLY],
  'hunter-survival': [TWO_HANDER],
  'mage-arcane': CASTER,
  'mage-fire': CASTER,
  'mage-frost': CASTER,
  'monk-brewmaster': [TWO_HANDER],
  'monk-mistweaver': CASTER,
  'monk-windwalker': [TWO_HANDER],
  'paladin-holy': CASTER,
  'paladin-protection': [SWORD_AND_BOARD],
  'paladin-retribution': [TWO_HANDER],
  'priest-discipline': CASTER,
  'priest-holy': CASTER,
  'priest-shadow': CASTER,
  'rogue-assassination': [DUAL_WIELD],
  'rogue-outlaw': [DUAL_WIELD],
  'rogue-subtlety': [DUAL_WIELD],
  'shaman-elemental': CASTER,
  'shaman-enhancement': [DUAL_WIELD],
  'shaman-restoration': CASTER,
  'warlock-affliction': CASTER,
  'warlock-demonology': CASTER,
  'warlock-destruction': CASTER,
  'warrior-arms': [TWO_HANDER],
  // Titan's Grip: a pair of two-handers, but only axes, maces and swords.
  'warrior-fury': [{ main: ['two-hand'], off: ['two-hand'], subclasses: ['Axe', 'Mace', 'Sword'] }],
  'warrior-protection': [SWORD_AND_BOARD],
};

export function loadoutsFor(slug: string): Loadout[] {
  const loadouts = LOADOUTS[slug];
  if (!loadouts) throw new Error(`No weapon loadout for spec ${slug}; add it to weaponProficiency.ts`);
  return loadouts;
}

export function fitsLoadout(item: IngestItem, loadout: Loadout, hand: 'main' | 'off'): boolean {
  const kinds = hand === 'main' ? loadout.main : loadout.off;
  const kind = weaponKind(item);
  if (!kinds || !kind || !kinds.includes(kind) || !fitsHand(item, hand)) return false;
  return !loadout.subclasses || loadout.subclasses.includes(item.item_subclass?.name ?? '');
}
