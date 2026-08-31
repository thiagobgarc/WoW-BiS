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
  type: z.enum(['raid', 'dungeon', 'crafted', 'vault', 'catalyst', 'world', 'pvp', 'profession']),
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
});
export type BisEntry = z.infer<typeof BisEntrySchema>;

export const BisListSchema = z.object({
  season: z.string(),
  class: z.string(),
  spec: z.string(),
  armorType: z.enum(['cloth', 'leather', 'mail', 'plate']),
  statPriority: z.array(z.enum(['haste', 'crit', 'versatility', 'mastery'])).length(4),
  entries: z.array(BisEntrySchema),
});
export type BisList = z.infer<typeof BisListSchema>;
