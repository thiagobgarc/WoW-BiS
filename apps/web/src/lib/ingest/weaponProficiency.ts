/**
 * Which weapons each class can equip. Like stat priority, Blizzard publishes
 * no endpoint for this, but unlike stat priority it is a fixed game rule, not
 * theorycraft, so it is safe to hand-maintain.
 *
 * Without it, primary stat was the only weapon gate, and an Enhancement
 * Shaman (agility) was offered a bow, a gun and a crossbow — agility weapons
 * a Shaman cannot equip.
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

const RANGED = new Set(['Bow', 'Crossbow', 'Gun']);

/**
 * Hunter is the one class whose specs split on weapon family rather than
 * just stats: Beast Mastery and Marksmanship fight with a ranged weapon,
 * Survival with a two-hand melee weapon. Offering either the other's weapon
 * is as wrong as offering a class something it cannot equip.
 */
function specAllowsSubclass(spec: Pick<SpecProfile, 'class' | 'spec'>, subclass: string): boolean {
  if (spec.class !== 'Hunter') return true;
  return spec.spec === 'Survival' ? !RANGED.has(subclass) : RANGED.has(subclass);
}

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
export function canEquipWeapon(item: IngestItem, spec: Pick<SpecProfile, 'class' | 'spec'>): boolean {
  const subclass = item.item_subclass?.name;
  if (!subclass || !KNOWN_WEAPON_SUBCLASSES.has(subclass)) return true;

  const allowed = BY_CLASS[spec.class]?.[subclass];
  if (!allowed) return false;
  if (allowed !== 'both' && allowed !== handsFor(item)) return false;
  return specAllowsSubclass(spec, subclass);
}
