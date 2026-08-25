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

// Real API shape (not `{ rating, value }` as the name might suggest):
// rating_normalized is the raw secondary-stat rating from gear, value is
// the actual in-game percent (already includes base/innate contributions).
const RatingStat = z.object({ rating_normalized: z.number(), value: z.number() }).loose();

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

// --- Talent trees -----------------------------------------------------
// Verified against a real GET .../talent-tree/{treeId}/playable-specialization/{specId}
// response — field names below (raw_position_x/y, locked_by, choice_of_tooltips,
// etc.) are exactly what Blizzard returns, not guessed from docs.

const TalentTreeIndexEntry = z.object({ key: z.object({ href: z.string() }).loose(), name: z.string() }).loose();

export const TalentTreeIndexSchema = z
  .object({
    class_talent_trees: z.array(TalentTreeIndexEntry),
    spec_talent_trees: z.array(TalentTreeIndexEntry),
  })
  .loose();
export type TalentTreeIndex = z.infer<typeof TalentTreeIndexSchema>;

const TalentTooltipSchema = z
  .object({
    talent: z.object({ id: z.number(), name: z.string() }).loose(),
    spell_tooltip: z
      .object({
        spell: z.object({ id: z.number(), name: z.string() }).loose(),
        // Verified live: some real talents (esp. hero talents) return
        // description: null rather than omitting the field — nullable, not
        // just optional.
        description: z.string().nullable().optional(),
        cast_time: z.string().nullable().optional(),
        cooldown: z.string().nullable().optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

const TalentRankSchema = z
  .object({
    rank: z.number(),
    default_points: z.number().optional(),
    tooltip: TalentTooltipSchema.optional(),
    // Present on CHOICE nodes instead of `tooltip` — one entry per option,
    // array index is what we treat as `optionIndex` throughout the app.
    choice_of_tooltips: z.array(TalentTooltipSchema).optional(),
  })
  .loose();

export const TalentNodeSchema = z
  .object({
    id: z.number(),
    node_type: z.object({ id: z.number(), type: z.enum(['ACTIVE', 'PASSIVE', 'CHOICE']) }).loose(),
    ranks: z.array(TalentRankSchema),
    display_row: z.number(),
    display_col: z.number(),
    raw_position_x: z.number().optional(),
    raw_position_y: z.number().optional(),
    locked_by: z.array(z.number()).optional(),
    unlocks: z.array(z.number()).optional(),
  })
  .loose();
export type TalentNode = z.infer<typeof TalentNodeSchema>;

// Hero talent node graphs come bundled in the same response as the class/spec
// trees (verified live) — no separate endpoint needed. A character picks
// exactly one of these per spec; which one (and its selections) is reported
// separately in CharacterSpecializationsSchema below.
const HeroTalentTreeSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    hero_talent_nodes: z.array(TalentNodeSchema),
  })
  .loose();

export const TalentTreeSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    class_talent_nodes: z.array(TalentNodeSchema),
    spec_talent_nodes: z.array(TalentNodeSchema),
    hero_talent_trees: z.array(HeroTalentTreeSchema).optional(),
  })
  .loose();
export type TalentTree = z.infer<typeof TalentTreeSchema>;

// --- Character specializations (the character's own current build) ----

const SelectedTalentSchema = z
  .object({ id: z.number(), rank: z.number().optional(), tooltip: TalentTooltipSchema.optional() })
  .loose();

const TalentLoadoutSchema = z
  .object({
    is_active: z.boolean(),
    selected_class_talents: z.array(SelectedTalentSchema).optional(),
    selected_spec_talents: z.array(SelectedTalentSchema).optional(),
    selected_hero_talents: z.array(SelectedTalentSchema).optional(),
    // id matches a TalentTree.hero_talent_trees[].id — which of the (usually
    // 2-3) hero options this character picked. Absent at low level.
    selected_hero_talent_tree: z.object({ id: z.number(), name: z.string() }).loose().optional(),
  })
  .loose();

export const CharacterSpecializationsSchema = z
  .object({
    specializations: z.array(
      z
        .object({
          specialization: z.object({ id: z.number(), name: z.string() }).loose(),
          loadouts: z.array(TalentLoadoutSchema).optional(),
        })
        .loose(),
    ),
  })
  .loose();
export type CharacterSpecializations = z.infer<typeof CharacterSpecializationsSchema>;
