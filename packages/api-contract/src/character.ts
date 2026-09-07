/**
 * GET /v1/character/:region/:realm/:name and its POST .../refresh.
 *
 * One round trip: this is exactly what apps/web's character page already
 * composes server-side (getFullCharacter + getBisList + getRecommendedBuild
 * + the meta tier badge + getCharacterTalents + getCharacterProgression),
 * returned as JSON instead of rendered as HTML. Splitting a single screen
 * into five requests would be five chances to fail on a phone network.
 *
 * `talents`/`recommendedTalents`/`progression` are nullable because they're
 * supplementary: the web page already treats a failure in any of them as
 * "render the page without that section", never as a failed page load, and
 * /v1 keeps that contract.
 */
import { z } from 'zod';
import { BisEntrySchema, StatPrioritySchema } from '@mythos/core/bis';
import { DomainCharacterSchema, EquipmentBySlotSchema, SecondaryStatsSchema } from '@mythos/core/character';
import { MetaTierSchema } from '@mythos/core/meta';
import { DomainMythicPlusProfileSchema, DomainRaidProgressSchema } from '@mythos/core/progression';
import {
  DomainHeroTreeSchema,
  DomainTalentTreeSchema,
  RecommendedTalentBuildSchema,
  TalentSelectionSchema,
} from '@mythos/core/talents';

/** Mirrors apps/web's CharacterTalents (getCharacterTalents.ts). */
export const CharacterTalentsSchema = z.object({
  tree: DomainTalentTreeSchema,
  /** null when the character has no active loadout for the spec at all. */
  current: z.array(TalentSelectionSchema).nullable(),
  heroTree: DomainHeroTreeSchema.nullable(),
  heroSelections: z.array(TalentSelectionSchema).nullable(),
  mock: z.boolean(),
});
export type CharacterTalents = z.infer<typeof CharacterTalentsSchema>;

export const CharacterProgressionSchema = z.object({
  raid: DomainRaidProgressSchema,
  mythicPlus: DomainMythicPlusProfileSchema,
});
export type CharacterProgression = z.infer<typeof CharacterProgressionSchema>;

export const CharacterBisSchema = z.object({
  entries: z.array(BisEntrySchema),
  seeded: z.boolean(),
  /** Absent when the spec isn't seeded — there's no priority to report. */
  statPriority: StatPrioritySchema.optional(),
});
export type CharacterBis = z.infer<typeof CharacterBisSchema>;

export const CharacterResponseSchema = z.object({
  character: DomainCharacterSchema,
  equipment: EquipmentBySlotSchema,
  stats: SecondaryStatsSchema,
  avatarUrl: z.string().nullable(),
  /** True when served from the built-in sample character, not Blizzard. */
  mock: z.boolean(),
  fetchedAt: z.number(),
  /** True when Blizzard was unavailable and this is the last good snapshot. */
  stale: z.boolean(),
  bis: CharacterBisSchema,
  /**
   * Present in the payload even though the mobile Talents UI is deferred to
   * 1.1: it's computed as part of the same server-side composition at no
   * extra Blizzard-call cost, so shipping the field now avoids a schema
   * change when the Talents tab lands. A v1 client simply ignores it.
   */
  talents: CharacterTalentsSchema.nullable(),
  recommendedTalents: RecommendedTalentBuildSchema.nullable(),
  progression: CharacterProgressionSchema.nullable(),
  metaTier: MetaTierSchema.nullable(),
});
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;

/**
 * POST .../refresh returns the same payload as the GET on success. On
 * cooldown it returns 429 with RateLimitedEnvelopeSchema — see error.ts for
 * why that's the standard envelope rather than the union the original
 * contract draft specced.
 */
export const RefreshResponseSchema = CharacterResponseSchema;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
