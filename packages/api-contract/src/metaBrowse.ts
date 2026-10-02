/**
 * The two character-independent `meta` endpoints, which back the mobile Meta
 * tab. Specced here but NOT implemented in v1: per architecture.md Section
 * 8.10 the v1 launch is Gear + Progression, and the Meta tab lands in 1.1.
 *
 * They're written now because everything they need already exists (the same
 * core schemas the character response uses), and because /v1 is
 * additive-only once a build ships to a store — knowing the shape now costs
 * nothing and avoids a second contract-design pass later. Nothing parses
 * these yet, so unlike the v1 schemas they have no route contract test
 * behind them; they're derived from the same core schemas, so they can't
 * drift from the domain types, but treat them as a draft until the 1.1
 * routes land.
 */
import { z } from 'zod';
import { MetaContentTypeSchema, MetaTierEntrySchema, MetaTierSchema } from '@mythos/core/meta';
import { DomainTalentTreeSchema, RecommendedTalentBuildSchema } from '@mythos/core/talents';

/** GET /v1/meta/tier-list/:season?contentType=mythic-plus|raid — 1.1 */
export const TierListResponseSchema = z.object({
  season: z.string(),
  contentType: MetaContentTypeSchema,
  lastUpdated: z.string(),
  source: z.string(),
  seeded: z.boolean(),
  entries: z.array(MetaTierEntrySchema),
});
export type TierListResponse = z.infer<typeof TierListResponseSchema>;

/** GET /v1/meta/spec-build/:class/:spec — 1.1 */
export const SpecBuildResponseSchema = z.object({
  class: z.string(),
  spec: z.string(),
  tree: DomainTalentTreeSchema,
  mythicPlusBuild: RecommendedTalentBuildSchema.nullable(),
  raidBuild: RecommendedTalentBuildSchema.nullable(),
  mythicPlusTier: MetaTierSchema.nullable(),
  raidTier: MetaTierSchema.nullable(),
});
export type SpecBuildResponse = z.infer<typeof SpecBuildResponseSchema>;
