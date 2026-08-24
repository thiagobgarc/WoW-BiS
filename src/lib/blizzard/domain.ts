/**
 * Internal domain types the rest of the app works with — decoupled from
 * Blizzard's raw response shape. `mapEquipment` etc. below are the only
 * places that translate between the two, so a Blizzard schema drift only
 * ever requires editing this file.
 */
import type {
  BlizzardEquippedItem,
  CharacterEquipment,
  CharacterProfile,
  CharacterStatistics,
} from './schemas';

export const EQUIPMENT_SLOTS = [
  'head',
  'neck',
  'shoulder',
  'back',
  'chest',
  'wrist',
  'hands',
  'waist',
  'legs',
  'feet',
  'finger_1',
  'finger_2',
  'trinket_1',
  'trinket_2',
  'main_hand',
  'off_hand',
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export interface DomainItem {
  slot: EquipmentSlot;
  itemId: number;
  name: string;
  quality: string; // lowercase: 'epic', 'rare', etc.
  itemLevel: number;
  iconUrl: string | null;
  isTierPiece: boolean;
  isEmbellishment: boolean;
  sockets: { filled: boolean; gemName?: string }[];
  enchantText: string | null;
  wowheadUrl: string;
}

export interface EquippedSlotEmpty {
  slot: EquipmentSlot;
  empty: true;
}

export type EquippedSlot = (DomainItem & { empty?: false }) | EquippedSlotEmpty;

export interface DomainCharacter {
  name: string;
  realmSlug: string;
  realmName: string;
  region: string;
  className: string;
  classSlug: string;
  specName: string | null;
  faction: string;
  guildName: string | null;
  level: number;
  averageItemLevel: number;
  equippedItemLevel: number;
  lastLoginTimestamp: number | null;
}

export interface SecondaryStats {
  haste: { rating: number; percent: number };
  crit: { rating: number; percent: number };
  mastery: { rating: number; percent: number };
  versatility: { rating: number; percent: number };
}

const SLOT_TYPE_MAP: Record<string, EquipmentSlot> = {
  HEAD: 'head',
  NECK: 'neck',
  SHOULDER: 'shoulder',
  BACK: 'back',
  CHEST: 'chest',
  WRIST: 'wrist',
  HANDS: 'hands',
  WAIST: 'waist',
  LEGS: 'legs',
  FEET: 'feet',
  FINGER_1: 'finger_1',
  FINGER_2: 'finger_2',
  TRINKET_1: 'trinket_1',
  TRINKET_2: 'trinket_2',
  MAIN_HAND: 'main_hand',
  OFF_HAND: 'off_hand',
};

export function mapProfile(raw: CharacterProfile, region: string): DomainCharacter {
  return {
    name: raw.name,
    realmSlug: raw.realm.slug,
    realmName: raw.realm.name,
    region,
    className: raw.character_class.name,
    classSlug: raw.character_class.name.toLowerCase().replace(/\s+/g, '-'),
    specName: raw.active_spec?.name ?? null,
    faction: raw.faction.name,
    guildName: raw.guild?.name ?? null,
    level: raw.level,
    averageItemLevel: raw.average_item_level,
    equippedItemLevel: raw.equipped_item_level,
    lastLoginTimestamp: raw.last_login_timestamp ?? null,
  };
}

function mapOneItem(raw: BlizzardEquippedItem, iconUrl: string | null): DomainItem | null {
  const slot = SLOT_TYPE_MAP[raw.slot.type];
  if (!slot) return null; // shirt/tabard/ranged — not part of the BiS comparison

  return {
    slot,
    itemId: raw.item.id,
    name: raw.name,
    quality: raw.quality.type.toLowerCase(),
    itemLevel: raw.level.value,
    iconUrl,
    isTierPiece: Boolean(raw.set),
    isEmbellishment: Boolean(raw.is_embellishment),
    sockets: (raw.sockets ?? []).map((s) => ({
      filled: Boolean(s.item),
      gemName: s.item?.name,
    })),
    enchantText: raw.enchantments?.[0]?.display_string ?? null,
    wowheadUrl: `https://www.wowhead.com/item=${raw.item.id}`,
  };
}

/**
 * Maps raw equipment to a slot -> item lookup. `iconUrls` is a pre-fetched
 * map of itemId -> media URL, since icons come from a separate endpoint
 * per item (see client.ts's batched media fetch).
 */
export type EquipmentBySlot = Partial<Record<EquipmentSlot, DomainItem>>;

export function mapEquipment(raw: CharacterEquipment, iconUrls: Map<number, string>): EquipmentBySlot {
  const result: EquipmentBySlot = {};
  for (const item of raw.equipped_items) {
    const mapped = mapOneItem(item, iconUrls.get(item.item.id) ?? null);
    if (mapped) result[mapped.slot] = mapped;
  }
  return result;
}

function ratingToPercent(rating: number): number {
  // Retail-era approximation: ~2200 rating per 32% at level 80 content.
  // Good enough for the "distribution vs ideal" bar chart; not combat log accurate.
  return Math.round((rating / 2200) * 32 * 10) / 10;
}

export function mapStatistics(raw: CharacterStatistics): SecondaryStats {
  const haste = raw.melee_haste ?? raw.spell_haste ?? raw.ranged_haste ?? { rating: 0, value: 0 };
  const crit = raw.melee_crit ?? raw.spell_crit ?? raw.ranged_crit ?? { rating: 0, value: 0 };
  const mastery = raw.mastery ?? { rating: 0, value: 0 };
  const versatility = raw.versatility ?? 0;

  return {
    haste: { rating: haste.rating, percent: ratingToPercent(haste.rating) },
    crit: { rating: crit.rating, percent: ratingToPercent(crit.rating) },
    mastery: { rating: mastery.rating, percent: ratingToPercent(mastery.rating) },
    versatility: { rating: versatility, percent: ratingToPercent(versatility) },
  };
}
