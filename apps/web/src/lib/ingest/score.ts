/**
 * Pure mapping and scoring. No I/O, no Blizzard calls — everything here is a
 * function of an already-fetched item, which is what makes the ranking
 * testable without a network.
 */
import type { ArmorType, BisSlot, StatPriority } from '@mythos/core/bis';
import type { IngestItem } from '@/lib/blizzard/schemas';
import type { PrimaryStat } from './specCatalogue';

export type Secondary = 'haste' | 'crit' | 'versatility' | 'mastery';

/** Blizzard's stat type strings, as they appear in preview_item.stats[].type.type. */
const SECONDARY_BY_TYPE: Record<string, Secondary> = {
  CRIT_RATING: 'crit',
  HASTE_RATING: 'haste',
  MASTERY_RATING: 'mastery',
  VERSATILITY: 'versatility',
};

const PRIMARY_BY_TYPE: Record<string, PrimaryStat> = {
  STRENGTH: 'strength',
  AGILITY: 'agility',
  INTELLECT: 'intellect',
};

/**
 * Blizzard inventory_type -> our BiS slot. Rings and trinkets collapse to the
 * pooled 'finger'/'trinket' categories the BiS schema models, not to
 * finger_1/finger_2 — see the note at the top of packages/core bis/types.ts.
 * Anything unmapped (bags, tabards, profession tools, cosmetics) is not gear
 * we rank, and returns null so the caller drops it.
 */
const SLOT_BY_INVENTORY_TYPE: Record<string, BisSlot> = {
  HEAD: 'head',
  NECK: 'neck',
  SHOULDER: 'shoulder',
  CLOAK: 'back',
  BACK: 'back',
  CHEST: 'chest',
  ROBE: 'chest',
  WRIST: 'wrist',
  HAND: 'hands',
  HANDS: 'hands',
  WAIST: 'waist',
  LEGS: 'legs',
  FEET: 'feet',
  FINGER: 'finger',
  TRINKET: 'trinket',
  WEAPON: 'main_hand',
  TWOHWEAPON: 'main_hand',
  WEAPONMAINHAND: 'main_hand',
  RANGED: 'main_hand',
  RANGEDRIGHT: 'main_hand',
  SHIELD: 'off_hand',
  HOLDABLE: 'off_hand',
  WEAPONOFFHAND: 'off_hand',
};

const ARMOR_BY_SUBCLASS: Record<string, ArmorType> = {
  Cloth: 'cloth',
  Leather: 'leather',
  Mail: 'mail',
  Plate: 'plate',
};

export function bisSlotFor(item: IngestItem): BisSlot | null {
  const type = item.inventory_type?.type;
  return type ? (SLOT_BY_INVENTORY_TYPE[type] ?? null) : null;
}

/** Null for neck/ring/trinket/weapons, which have no armor class restriction. */
export function armorTypeFor(item: IngestItem): ArmorType | null {
  const sub = item.item_subclass?.name;
  return sub ? (ARMOR_BY_SUBCLASS[sub] ?? null) : null;
}

export interface ParsedStats {
  primary: Partial<Record<PrimaryStat, number>>;
  secondary: Record<Secondary, number>;
  /** True when the item allocates no secondary budget at all. */
  secondaryEmpty: boolean;
}

export function parseItemStats(item: IngestItem): ParsedStats {
  const primary: Partial<Record<PrimaryStat, number>> = {};
  const secondary: Record<Secondary, number> = { haste: 0, crit: 0, versatility: 0, mastery: 0 };

  for (const stat of item.preview_item?.stats ?? []) {
    // A negated stat is a downgrade shown in grey in-game; it contributes
    // nothing and must not be counted as budget toward a priority fit.
    if (stat.is_negated) continue;
    const type = stat.type?.type;
    if (!type) continue;
    const prim = PRIMARY_BY_TYPE[type];
    if (prim) {
      primary[prim] = (primary[prim] ?? 0) + stat.value;
      continue;
    }
    const sec = SECONDARY_BY_TYPE[type];
    if (sec) secondary[sec] += stat.value;
  }

  const secondaryEmpty = (['haste', 'crit', 'versatility', 'mastery'] as const).every((k) => secondary[k] === 0);
  return { primary, secondary, secondaryEmpty };
}

/**
 * Weight per position in the spec's stat priority. The curve is the judgement
 * call in this file: a linear 4/3/2/1 under-punishes an item that dumps its
 * whole budget into the worst stat, and a steep exponential makes rank 2 and
 * rank 3 indistinguishable. This sits between them, so an item stacked on the
 * top stat clearly beats a balanced one without a bottom-stat item scoring
 * near zero and dropping below an item with no secondaries at all.
 */
const PRIORITY_WEIGHTS = [1, 0.65, 0.4, 0.2];

/** Items with no secondary budget are unscoreable, not bad. */
export const NEUTRAL_FIT = 50;

/**
 * 0-100. 100 means every point of secondary budget sits on the spec's top
 * stat; 20 means it all sits on its worst.
 */
export function statPriorityFit(stats: ParsedStats, priority: StatPriority): number {
  if (stats.secondaryEmpty) return NEUTRAL_FIT;

  let weighted = 0;
  let total = 0;
  for (const [index, stat] of priority.entries()) {
    const value = stats.secondary[stat];
    weighted += value * (PRIORITY_WEIGHTS[index] ?? 0);
    total += value;
  }
  if (total === 0) return NEUTRAL_FIT;
  return Math.round((weighted / total) * 100);
}

/**
 * Whether a spec can actually wear this item — armor class, and nothing else.
 *
 * Primary stat deliberately does NOT filter here, despite being the obvious
 * thing to reach for. Modern armor has an adaptive primary stat, and the
 * static item endpoint reports one representative allocation rather than the
 * per-spec value: the season's plate chest "Baleful Grave-Knight's
 * Breastplate" lists INTELLECT and STRENGTH together, while other plate in
 * the same raid lists INTELLECT alone. Filtering on it excluded every
 * strength and agility spec from all armor and left them with four slots
 * (neck, back, finger, trinket) out of fourteen.
 *
 * Weapons are also unfiltered. Real weapon-type restrictions exist, but the
 * static endpoint does not expose them cleanly enough to filter on without
 * dropping legitimate picks, and over-filtering fails silently while
 * under-filtering merely offers a weapon a spec will visibly never equip.
 */
export function isUsableBySpec(item: IngestItem, specArmor: ArmorType): boolean {
  // Cloaks are classed as Cloth by Blizzard but every class wears them.
  // Without this exemption the armor gate denied the back slot to every
  // leather, mail and plate spec — 0 candidates each, while cloth got 6.
  if (bisSlotFor(item) === 'back') return true;

  const armor = armorTypeFor(item);
  return armor === null || armor === specArmor;
}

/** Cosmetics, housing decor and quest items all land in the journal tables. */
export function isRankableGear(item: IngestItem): boolean {
  if (item.inventory_type?.type === 'NON_EQUIP') return false;
  if (bisSlotFor(item) === null) return false;
  if (item.level <= 1) return false; // cosmetic/transmog copies report level 1
  if (item.quality?.type === 'POOR') return false;
  return true;
}
