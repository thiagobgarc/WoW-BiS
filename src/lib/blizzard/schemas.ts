/**
 * Zod schemas for every Blizzard Battle.net API response this app consumes.
 *
 * These are intentionally *partial* mirrors of Blizzard's real payloads —
 * we only assert the shape of fields we actually read, and every object
 * schema is `.loose()` so additive changes on Blizzard's side don't
 * break us. Required fields we depend on are still strict: if Blizzard
 * removes or renames one of *those*, parsing fails loudly and the route
 * degrades to a typed error instead of a white screen (see client.ts).
 *
 * If the live API shape differs from what's modeled here, trust the live
 * API and update this file — never silently loosen a schema to make an
 * error disappear.
 */
import { z } from 'zod';

const localizedName = z.object({ id: z.number(), name: z.string(), key: z.object({ href: z.string() }).optional() }).loose();

export const CharacterProfileSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    level: z.number(),
    faction: z.object({ type: z.string(), name: z.string() }).loose(),
    race: localizedName,
    character_class: localizedName,
    active_spec: localizedName.optional(),
    realm: z.object({ id: z.number(), name: z.string(), slug: z.string() }).loose(),
    guild: z.object({ name: z.string() }).loose().optional(),
    average_item_level: z.number(),
    equipped_item_level: z.number(),
    last_login_timestamp: z.number().optional(),
  })
  .loose();
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

const ItemStatSchema = z
  .object({
    type: z.object({ type: z.string(), name: z.string() }).loose(),
    value: z.number(),
    display: z.object({ display_string: z.string() }).loose().optional(),
  })
  .loose();

const SocketSchema = z
  .object({
    socket_type: z.object({ type: z.string(), name: z.string() }).loose(),
    item: z.object({ id: z.number(), name: z.string().optional() }).loose().optional(),
    display_string: z.string().optional(),
  })
  .loose();

const EnchantmentSchema = z
  .object({
    enchantment_id: z.number(),
    display_string: z.string().optional(),
  })
  .loose();

const EquippedItemSchema = z
  .object({
    item: z.object({ id: z.number() }).loose(),
    slot: z.object({ type: z.string(), name: z.string() }).loose(),
    quality: z.object({ type: z.string(), name: z.string() }).loose(),
    name: z.string(),
    level: z.object({ value: z.number() }).loose(),
    media: z.object({ id: z.number() }).loose().optional(),
    set: z
      .object({
        item_set: z.object({ id: z.number(), name: z.string() }).loose(),
        display_string: z.string().optional(),
      })
      .loose()
      .optional(),
    sockets: z.array(SocketSchema).optional(),
    enchantments: z.array(EnchantmentSchema).optional(),
    stats: z.array(ItemStatSchema).optional(),
    is_embellishment: z.boolean().optional(),
  })
  .loose();
export type BlizzardEquippedItem = z.infer<typeof EquippedItemSchema>;

export const CharacterEquipmentSchema = z
  .object({
    equipped_items: z.array(EquippedItemSchema),
  })
  .loose();
export type CharacterEquipment = z.infer<typeof CharacterEquipmentSchema>;

export const CharacterMediaSchema = z
  .object({
    assets: z.array(z.object({ key: z.string(), value: z.string() }).loose()),
  })
  .loose();
export type CharacterMedia = z.infer<typeof CharacterMediaSchema>;

const RatingStat = z.object({ rating: z.number(), value: z.number() }).loose();

export const CharacterStatisticsSchema = z
  .object({
    health: z.number(),
    strength: z.object({ effective: z.number() }).loose().optional(),
    agility: z.object({ effective: z.number() }).loose().optional(),
    intellect: z.object({ effective: z.number() }).loose().optional(),
    stamina: z.object({ effective: z.number() }).loose().optional(),
    melee_crit: RatingStat.optional(),
    spell_crit: RatingStat.optional(),
    ranged_crit: RatingStat.optional(),
    melee_haste: RatingStat.optional(),
    spell_haste: RatingStat.optional(),
    ranged_haste: RatingStat.optional(),
    mastery: RatingStat.optional(),
    versatility: z.number().optional(),
    versatility_damage_done_bonus: z.number().optional(),
  })
  .loose();
export type CharacterStatistics = z.infer<typeof CharacterStatisticsSchema>;

export const ItemSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    quality: z.object({ type: z.string(), name: z.string() }).loose(),
    level: z.number(),
    inventory_type: z.object({ type: z.string() }).loose().optional(),
  })
  .loose();
export type BlizzardItem = z.infer<typeof ItemSchema>;

export const ItemMediaSchema = z
  .object({
    assets: z.array(z.object({ key: z.string(), value: z.string() }).loose()),
  })
  .loose();

export const RealmIndexSchema = z
  .object({
    realms: z.array(z.object({ id: z.number(), name: z.string(), slug: z.string() }).loose()),
  })
  .loose();
export type RealmIndex = z.infer<typeof RealmIndexSchema>;
