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
 *
 * Phase 3 made these Zod-first (schema + `z.infer`) rather than hand-written
 * interfaces. These shapes ARE the /v1 payload shapes — the API returns
 * exactly what the mappers produce — so packages/api-contract composes its
 * response schemas from the schemas below instead of maintaining a parallel
 * copy that could drift. Same pattern bis/types.ts and talents/types.ts
 * already used for the seed-file schemas.
 */
import { z } from 'zod';

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

export const EquipmentSlotSchema = z.enum(EQUIPMENT_SLOTS);
export type EquipmentSlot = z.infer<typeof EquipmentSlotSchema>;

export const DomainItemStatSchema = z.object({
  text: z.string(),
  color: z.string(),
});
export type DomainItemStat = z.infer<typeof DomainItemStatSchema>;

export const DomainItemSetSchema = z.object({
  name: z.string(),
  ownedCount: z.number(),
  totalCount: z.number(),
  effects: z.array(z.object({ text: z.string(), requiredCount: z.number(), active: z.boolean() })),
});
export type DomainItemSet = z.infer<typeof DomainItemSetSchema>;

export const DomainItemSchema = z.object({
  slot: EquipmentSlotSchema,
  itemId: z.number(),
  name: z.string(),
  quality: z.string(),
  itemLevel: z.number(),
  iconUrl: z.string().nullable(),
  isTierPiece: z.boolean(),
  isEmbellishment: z.boolean(),
  sockets: z.array(z.object({ filled: z.boolean(), gemName: z.string().optional() })),
  enchantText: z.string().nullable(),
  wowheadUrl: z.string(),
  bindingText: z.string().nullable(),
  armorTypeLabel: z.string().nullable(),
  armorLine: DomainItemStatSchema.nullable(),
  weaponLines: z.array(z.string()),
  stats: z.array(DomainItemStatSchema),
  procs: z.array(z.string()),
  requiredLevelText: z.string().nullable(),
  classesText: z.string().nullable(),
  setInfo: DomainItemSetSchema.nullable(),
});
export type DomainItem = z.infer<typeof DomainItemSchema>;

/**
 * A slot the character has nothing equipped in. Presentation-only (the paper
 * doll renders an empty tile) — it never appears in an EquipmentBySlot map or
 * in a /v1 payload, so it stays a plain type with no schema.
 */
export interface EquippedSlotEmpty {
  slot: EquipmentSlot;
  empty: true;
}

export type EquippedSlot = (DomainItem & { empty?: false }) | EquippedSlotEmpty;

/** Absent slots mean "nothing equipped there" — see EquippedSlotEmpty. */
export const EquipmentBySlotSchema = z.partialRecord(EquipmentSlotSchema, DomainItemSchema);
export type EquipmentBySlot = z.infer<typeof EquipmentBySlotSchema>;

export const DomainCharacterSchema = z.object({
  name: z.string(),
  realmSlug: z.string(),
  realmName: z.string(),
  region: z.string(),
  className: z.string(),
  classSlug: z.string(),
  specName: z.string().nullable(),
  specId: z.number().nullable(),
  faction: z.string(),
  guildName: z.string().nullable(),
  level: z.number(),
  averageItemLevel: z.number(),
  equippedItemLevel: z.number(),
  lastLoginTimestamp: z.number().nullable(),
});
export type DomainCharacter = z.infer<typeof DomainCharacterSchema>;

const StatRatingSchema = z.object({ rating: z.number(), percent: z.number() });

export const SecondaryStatsSchema = z.object({
  haste: StatRatingSchema,
  crit: StatRatingSchema,
  mastery: StatRatingSchema,
  versatility: StatRatingSchema,
});
export type SecondaryStats = z.infer<typeof SecondaryStatsSchema>;
