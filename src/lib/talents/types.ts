/**
 * Recommended-build seed schema — our own data, not Blizzard's. Mirrors
 * bis/types.ts's shape/purpose: a hand-authored JSON file per class/spec/
 * content-type under /data/talents ('mythic-plus' and 'raid' — hero talent
 * recommendations aren't seeded for either yet, see the scoping note in
 * the season's data files).
 */
import { z } from 'zod';

export const RecommendedSelectionSchema = z.object({
  nodeId: z.number(),
  rank: z.number().int().min(1),
  optionIndex: z.number().int().min(0).default(0),
});
export type RecommendedSelection = z.infer<typeof RecommendedSelectionSchema>;

export const RecommendedContentTypeSchema = z.enum(['mythic-plus', 'raid']);
export type RecommendedContentType = z.infer<typeof RecommendedContentTypeSchema>;

export const RecommendedTalentBuildSchema = z.object({
  season: z.string(),
  class: z.string(),
  spec: z.string(),
  contentType: RecommendedContentTypeSchema,
  classSelections: z.array(RecommendedSelectionSchema),
  specSelections: z.array(RecommendedSelectionSchema),
  notes: z.string().optional(),
});
export type RecommendedTalentBuild = z.infer<typeof RecommendedTalentBuildSchema>;
