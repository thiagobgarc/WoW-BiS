/**
 * BiS list schema. Deviates from a naive per-physical-slot list in one
 * deliberate way: rings and trinkets are modeled as a single ranked pool
 * per generic slot ('finger' / 'trinket'), not per physical slot
 * (finger_1/finger_2). That's what makes them an assignment problem
 * instead of a naive slot-1-to-rank-1 comparison — see compareGear.ts.
 * Rank 1 + rank 2 together are "the" BiS loadout for a dual-slot category;
 * rank 3+ are fallbacks if you can't get both.
 */
import { z } from 'zod';

export const BIS_SLOTS = [
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
  'finger',
  'trinket',
  'main_hand',
  'off_hand',
] as const;
export type BisSlot = (typeof BIS_SLOTS)[number];

export const DUAL_SLOT_CATEGORIES = ['finger', 'trinket'] as const;

export const CONTENT_TYPES = ['raid', 'mythic-plus', 'pvp'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const SourceSchema = z.object({
  // 'other': worn by top players but in no Adventure Guide loot table and not
  // crafted. Labelled as unknown rather than guessed (e.g. as a world drop).
  type: z.enum(['raid', 'dungeon', 'crafted', 'vault', 'catalyst', 'world', 'pvp', 'profession', 'other']),
  instance: z.string().optional(),
  boss: z.string().optional(),
  difficulty: z.enum(['lfr', 'normal', 'heroic', 'mythic']).optional(),
  dungeon: z.string().optional(),
  keyLevel: z.number().optional(),
  craftQuality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const BisEntrySchema = z.object({
  slot: z.enum(BIS_SLOTS),
  contentType: z.enum(CONTENT_TYPES),
  rank: z.number().int().min(1),
  itemId: z.number(),
  itemName: z.string(),
  itemLevel: z.number(),
  source: SourceSchema,
  tierPiece: z.boolean(),
  catalystable: z.boolean(),
  statPriorityFit: z.number().min(0).max(100),
  notes: z.string().optional(),
  /**
   * Percent of sampled top players wearing this item. Absent when the entry
   * came from stat fit instead (too few players to sample, or a slot the
   * sample did not cover).
   */
  popularity: z.number().min(0).max(100).optional(),
});
export type BisEntry = z.infer<typeof BisEntrySchema>;

export const ArmorTypeSchema = z.enum(['cloth', 'leather', 'mail', 'plate']);
export type ArmorType = z.infer<typeof ArmorTypeSchema>;

/** Always all four secondaries, most valuable first. */
export const StatPrioritySchema = z.array(z.enum(['haste', 'crit', 'versatility', 'mastery'])).length(4);
export type StatPriority = z.infer<typeof StatPrioritySchema>;

export const BisListSchema = z.object({
  season: z.string(),
  class: z.string(),
  spec: z.string(),
  armorType: ArmorTypeSchema,
  statPriority: StatPrioritySchema,
  entries: z.array(BisEntrySchema),
  /** Who the popularity in each content type was measured on. */
  samples: z
    .partialRecord(
      z.enum(CONTENT_TYPES),
      z.object({
        players: z.number().int().min(0),
        source: z.enum(['warcraftlogs', 'raiderio']),
        collectedAt: z.string(),
      }),
    )
    .optional(),
});
export type BisList = z.infer<typeof BisListSchema>;
export type BisSample = NonNullable<BisList['samples']>[ContentType];
