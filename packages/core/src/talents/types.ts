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

/**
 * A character's current talent pick for one tree node — extracted from
 * apps/web's domain.ts (see character/types.ts's header for why: type-only,
 * the mapper that produces this from Blizzard's raw response stays
 * server-side). Lives here rather than in character/types.ts because it's
 * talent-tree shaped, not character-identity shaped.
 */
export const TalentSelectionSchema = z.object({
  nodeId: z.number(),
  rank: z.number(),
  /** Which entry in the node's `options` is selected; 0 for non-choice nodes. */
  optionIndex: z.number(),
});
export type TalentSelection = z.infer<typeof TalentSelectionSchema>;

/**
 * The talent tree's node graph — static game data per spec, identical for
 * every character of that spec. Moved here in Phase 3 (deferred from Phase
 * 2, see docs/architecture.md Section 0's scope note) because
 * `GET /v1/character/...` returns it inside its `talents` field, so
 * packages/api-contract needs the shape. As with character/types.ts only
 * the shape moves: `mapTalentTree`, which builds one of these out of
 * Blizzard's raw Trait Tree response, stays in apps/web.
 */
export const TalentOptionSchema = z.object({
  talentId: z.number(),
  name: z.string(),
  spellId: z.number().nullable(),
  description: z.string().optional(),
  iconUrl: z.string().nullable(),
});
export type TalentOption = z.infer<typeof TalentOptionSchema>;

export const DomainTalentNodeSchema = z.object({
  id: z.number(),
  type: z.enum(['active', 'passive', 'choice']),
  row: z.number(),
  col: z.number(),
  maxRank: z.number(),
  prerequisiteIds: z.array(z.number()),
  /** One entry for ACTIVE/PASSIVE nodes, 2+ for CHOICE nodes, empty for
   * structural nodes (e.g. the top-of-tree spec selector) with no tooltip. */
  options: z.array(TalentOptionSchema),
});
export type DomainTalentNode = z.infer<typeof DomainTalentNodeSchema>;

export const DomainHeroTreeSchema = z.object({
  id: z.number(),
  name: z.string(),
  nodes: z.array(DomainTalentNodeSchema),
});
export type DomainHeroTree = z.infer<typeof DomainHeroTreeSchema>;

export const DomainTalentTreeSchema = z.object({
  classNodes: z.array(DomainTalentNodeSchema),
  specNodes: z.array(DomainTalentNodeSchema),
  /** All hero options available for this spec (usually 2-3) — the character
   * has picked at most one, see apps/web's `mapTalentSelections`. */
  heroTrees: z.array(DomainHeroTreeSchema),
});
export type DomainTalentTree = z.infer<typeof DomainTalentTreeSchema>;
