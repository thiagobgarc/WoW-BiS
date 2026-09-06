/**
 * Equipment/item domain types, extracted from apps/web's
 * src/lib/blizzard/domain.ts so compareGear/deriveActionGroups can be
 * typed without depending on that file's Blizzard-raw-response mappers
 * (which stay server-side — see docs/architecture.md Section 1). This is
 * a type-only extraction: the mapper functions that produce these shapes
 * from Blizzard's API responses are not here and never will be — mobile
 * only ever receives already-mapped JSON matching these shapes from the
 * /v1 API, it never re-runs the mappers itself.
 *
 * apps/web's domain.ts re-exports these verbatim so its ~20 existing
 * consumers (`import type { EquipmentBySlot } from '@/lib/blizzard/domain'`)
 * are unaffected by this move.
 */

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

export interface DomainItemStat {
  text: string;
  color: string;
}

export interface DomainItemSet {
  name: string;
  ownedCount: number;
  totalCount: number;
  effects: { text: string; requiredCount: number; active: boolean }[];
}

export interface DomainItem {
  slot: EquipmentSlot;
  itemId: number;
  name: string;
  quality: string;
  itemLevel: number;
  iconUrl: string | null;
  isTierPiece: boolean;
  isEmbellishment: boolean;
  sockets: { filled: boolean; gemName?: string }[];
  enchantText: string | null;
  wowheadUrl: string;
  bindingText: string | null;
  armorTypeLabel: string | null;
  armorLine: DomainItemStat | null;
  weaponLines: string[];
  stats: DomainItemStat[];
  procs: string[];
  requiredLevelText: string | null;
  classesText: string | null;
  setInfo: DomainItemSet | null;
}

export interface EquippedSlotEmpty {
  slot: EquipmentSlot;
  empty: true;
}

export type EquippedSlot = (DomainItem & { empty?: false }) | EquippedSlotEmpty;

export type EquipmentBySlot = Partial<Record<EquipmentSlot, DomainItem>>;

export interface DomainCharacter {
  name: string;
  realmSlug: string;
  realmName: string;
  region: string;
  className: string;
  classSlug: string;
  specName: string | null;
  specId: number | null;
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
