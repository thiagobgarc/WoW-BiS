/**
 * Recommended-build seed schema — our own data, not Blizzard's. Mirrors
 * bis/types.ts's shape/purpose: a hand-authored JSON file per class/spec
 * under /data/talents, one generic build per content type (currently just
 * 'mythic-plus' — see the scoping note in the season's data files).
 */
import { z } from 'zod';

export const RecommendedSelectionSchema = z.object({
  nodeId: z.number(),
  rank: z.number().int().min(1),
  optionIndex: z.number().int().min(0).default(0),
});
export type RecommendedSelection = z.infer<typeof RecommendedSelectionSchema>;

export const RecommendedTalentBuildSchema = z.object({
  season: z.string(),
  class: z.string(),
  spec: z.string(),
  contentType: z.literal('mythic-plus'),
  classSelections: z.array(RecommendedSelectionSchema),
  specSelections: z.array(RecommendedSelectionSchema),
  notes: z.string().optional(),
});
export type RecommendedTalentBuild = z.infer<typeof RecommendedTalentBuildSchema>;
