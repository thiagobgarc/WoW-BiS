/**
 * GET /v1/meta — server + season metadata, called on app launch.
 *
 * This is the endpoint that makes "no hardcoded season data in the mobile
 * binary" (architecture.md Section 5) true: the app learns the current
 * season id here and uses it for every subsequent /v1/bis/:season call, so
 * a season roll is a web deploy, not an app-store release.
 */
import { z } from 'zod';
import { ArmorTypeSchema } from '@mythos/core/bis';

export const SeededSpecSchema = z.object({
  class: z.string(),
  spec: z.string(),
  armorType: ArmorTypeSchema,
});
export type SeededSpec = z.infer<typeof SeededSpecSchema>;

export const MetaResponseSchema = z.object({
  season: z.object({
    id: z.string(),
    displayName: z.string(),
    raidName: z.string(),
  }),
  /** Which class/spec combinations have BiS data this season. */
  seededSpecs: z.array(SeededSpecSchema),
  /**
   * Semver. A client older than this shows the blocking update-required
   * screen before rendering anything. '0.0.0' means nothing is gated.
   */
  minimumSupportedClientVersion: z.string(),
  /** Operational banner, e.g. a known Blizzard outage. null when all clear. */
  notice: z.string().nullable(),
});
export type MetaResponse = z.infer<typeof MetaResponseSchema>;
