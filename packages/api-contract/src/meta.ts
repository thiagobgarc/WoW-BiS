/**
 * GET /v1/meta — server + season metadata, called on app launch.
 *
 * This is the endpoint that makes "no hardcoded season data in the mobile
 * binary" (architecture.md Section 5) true: the app learns the current
 * season id here and uses it for every subsequent /v1/bis/:season call, so
 * a season roll is a web deploy, not an app-store release.
 */
import { z } from 'zod';
import { ArmorTypeSchema, SeasonSlotsSchema } from '@mythos/core/bis';

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
  /**
   * Which slots this season takes an enchant, and which can carry a crafted
   * embellishment. `deriveActionGroups` needs both to produce the upgrade
   * board's quick wins, no Blizzard payload carries them, and
   * architecture.md Section 5 forbids compiling either list into the app —
   * they rotate by season and patch. So they arrive here, with the rest of
   * the season's reference data.
   *
   * Optional, and deliberately so: this field was added after v1's client
   * shipped its first build. A required field would mean a client newer
   * than the deployed server fails to parse this whole response — taking
   * the season line and, worse, the `minimumSupportedClientVersion` gate
   * down with it — in exchange for a section of hints. Absent means "no
   * enchant or embellishment hints", never a hardcoded fallback.
   */
  seasonSlots: SeasonSlotsSchema.optional(),
});
export type MetaResponse = z.infer<typeof MetaResponseSchema>;
