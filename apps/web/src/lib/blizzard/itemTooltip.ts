/**
 * Maps `/data/wow/item/{id}` into what a BiS item tooltip shows.
 *
 * The character page's tooltip can print exact stat lines because Blizzard
 * sends them per character, already scaled. Here there is no character: the
 * item endpoint only describes the item at its *base* item level (a 318 raid
 * drop comes back at 219), and nothing first-party scales it. So this keeps
 * to what stays true at any item level:
 *
 * - which primary stat the item carries, not how much of it;
 * - how its secondary budget is split. Secondaries on one item scale
 *   together, so "Crit 57% / Mastery 43%" holds at 219 and at 318 alike;
 * - its effects, whose numbers are base-level and are labelled as such by
 *   the component.
 */
import type { ItemTooltipSource } from './schemas';

export interface BisItemSecondary {
  label: string;
  /** Whole-number share of the item's secondary stat budget; shares sum to 100. */
  share: number;
}

export interface BisItemTooltip {
  baseItemLevel: number | null;
  nameDescription: { text: string; color: string } | null;
  bindingText: string | null;
  /** Equip slot as the game words it: "Head", "One-Hand", "Trinket". */
  slotText: string | null;
  /** Armor or weapon type: "Plate", "Axe". */
  typeText: string | null;
  uniqueText: string | null;
  weaponSpeed: string | null;
  /** "Strength", or "Strength or Intellect" when the item flexes. */
  primaryStat: string | null;
  secondaries: BisItemSecondary[];
  /** Avoidance, Leech, Speed — no share, they draw on a separate budget. */
  tertiaries: string[];
  effects: string[];
  setName: string | null;
  flavorText: string | null;
  requiredLevelText: string | null;
  classesText: string | null;
}

const PRIMARY: Record<string, string> = { STRENGTH: 'Strength', AGILITY: 'Agility', INTELLECT: 'Intellect' };
const SECONDARY: Record<string, string> = {
  CRIT_RATING: 'Critical Strike',
  HASTE_RATING: 'Haste',
  MASTERY_RATING: 'Mastery',
  VERSATILITY: 'Versatility',
};
const TERTIARY: Record<string, string> = { AVOIDANCE_RATING: 'Avoidance', LIFESTEAL_RATING: 'Leech', SPEED_RATING: 'Speed' };

/** Item class ids whose subclass is a meaningful type label (Weapon, Armor). */
const TYPED_ITEM_CLASSES = new Set([2, 4]);

/** Rounds to whole percentages that still sum to 100 (largest remainder). */
function toShares(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const shares = exact.map(Math.floor);
  const order = exact.map((e, i) => ({ i, rest: e - Math.floor(e) })).sort((a, b) => b.rest - a.rest);
  const missing = 100 - shares.reduce((a, b) => a + b, 0);
  for (let k = 0; k < missing; k++) shares[order[k]!.i]! += 1;
  return shares;
}

function cssColor(color: { r: number; g: number; b: number; a: number } | undefined): string {
  return color ? `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})` : 'inherit';
}

/**
 * @param specPrimaryStat The page's spec primary stat ("strength"). Blizzard
 *   marks every primary stat negated when there is no class to read for, so
 *   it can't say which one applies — the spec can.
 */
export function toBisItemTooltip(raw: ItemTooltipSource, specPrimaryStat?: string): BisItemTooltip {
  const p = raw.preview_item;
  const stats = p.stats ?? [];

  const primaries = [...new Set(stats.map((s) => PRIMARY[s.type.type]).filter((s): s is string => Boolean(s)))];
  const forSpec = primaries.find((s) => s.toLowerCase() === specPrimaryStat?.toLowerCase());

  const secondaryStats = stats
    .filter((s) => SECONDARY[s.type.type] && s.value > 0)
    .sort((a, b) => b.value - a.value);
  const shares = toShares(secondaryStats.map((s) => s.value));

  const typeText =
    p.item_class && TYPED_ITEM_CLASSES.has(p.item_class.id) && p.item_subclass && p.item_subclass.name !== 'Miscellaneous'
      ? p.item_subclass.name
      : null;

  return {
    baseItemLevel: p.level?.value ?? null,
    nameDescription: p.name_description
      ? { text: p.name_description.display_string, color: cssColor(p.name_description.color) }
      : null,
    bindingText: p.binding?.name ?? null,
    slotText: p.inventory_type?.name ?? null,
    typeText,
    uniqueText: p.limit_category ?? p.unique_equipped ?? null,
    weaponSpeed: p.weapon?.attack_speed?.display_string ?? null,
    primaryStat: forSpec ?? (primaries.length > 0 ? primaries.join(' or ') : null),
    secondaries: secondaryStats.map((s, i) => ({ label: SECONDARY[s.type.type]!, share: shares[i]! })),
    tertiaries: stats.map((s) => TERTIARY[s.type.type]).filter((s): s is string => Boolean(s)),
    effects: (p.spells ?? []).map((s) => s.description?.replace(/\r\n/g, '\n').trim()).filter((s): s is string => Boolean(s)),
    setName: p.set?.item_set.name ?? null,
    flavorText: p.description?.trim() || null,
    requiredLevelText: p.requirements?.level?.display_string ?? null,
    classesText: p.requirements?.playable_classes?.display_string ?? null,
  };
}
