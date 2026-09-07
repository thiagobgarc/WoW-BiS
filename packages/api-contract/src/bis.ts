/**
 * GET /v1/bis/:season — the season's BiS seed data.
 *
 * One response shape for both modes the contract describes: with no
 * class/spec query params `specs` is the whole seeded season (the offline
 * prefetch case); with them it's the single matching spec, or empty if that
 * spec isn't seeded. The original draft described these as two shapes; one
 * shape with a filtered array means a client has one parser and one cache
 * entry format either way.
 *
 * `version` changes whenever the season's seed content changes, so a client
 * (or an ETag) can skip re-downloading an unchanged season.
 */
import { z } from 'zod';
import { ArmorTypeSchema, BisEntrySchema, StatPrioritySchema } from '@mythos/core/bis';

export const BisSpecSchema = z.object({
  class: z.string(),
  spec: z.string(),
  armorType: ArmorTypeSchema,
  statPriority: StatPrioritySchema,
  entries: z.array(BisEntrySchema),
});
export type BisSpec = z.infer<typeof BisSpecSchema>;

export const BisSeasonResponseSchema = z.object({
  season: z.string(),
  /** Content hash of `specs` — stable across requests, changes on re-seed. */
  version: z.string(),
  specs: z.array(BisSpecSchema),
});
export type BisSeasonResponse = z.infer<typeof BisSeasonResponseSchema>;
