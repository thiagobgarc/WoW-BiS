/**
 * GET /v1/meta — server + season metadata, called on app launch.
 * Rate limit: 60/60s per IP.
 *
 * The endpoint that keeps season data out of the mobile binary
 * (architecture.md Section 5): the client learns the current season id here
 * and uses it for every /v1/bis/:season call afterwards, so a season roll
 * ships as a web deploy rather than an app-store release.
 */
import type { APIRoute } from 'astro';
import type { MetaResponse } from '@mythos/api-contract';
import { getBisSeason } from '@/lib/bis/getBisSeason';
import { MINIMUM_SUPPORTED_CLIENT_VERSION, apiNotice } from '@/lib/api/v1/config';
import { toV1Error, v1Json, v1RateLimitGate } from '@/lib/http/v1';
import { seasonConfig } from '@/lib/season/seasonConfig';

export const prerender = false;

export const GET: APIRoute = async ({ clientAddress }) => {
  const limited = await v1RateLimitGate('meta', () => clientAddress, 60, 60);
  if (limited) return limited;

  try {
    const specs = await getBisSeason(seasonConfig.id);

    const body: MetaResponse = {
      season: {
        id: seasonConfig.id,
        displayName: seasonConfig.displayName,
        raidName: seasonConfig.raid.name,
      },
      seededSpecs: specs.map(({ class: className, spec, armorType }) => ({ class: className, spec, armorType })),
      minimumSupportedClientVersion: MINIMUM_SUPPORTED_CLIENT_VERSION,
      notice: apiNotice(),
      // The mobile upgrade board's quick wins run deriveActionGroups on
      // device, and these two lists are the only inputs it needs that no
      // character payload carries. Serving them here is what keeps them out
      // of the app binary (architecture.md Section 5).
      seasonSlots: {
        enchantableSlots: seasonConfig.enchantableSlots,
        embellishableSlots: seasonConfig.embellishableSlots,
      },
    };

    return v1Json(body);
  } catch (err) {
    const { status, body } = toV1Error(err);
    return v1Json(body, status);
  }
};
