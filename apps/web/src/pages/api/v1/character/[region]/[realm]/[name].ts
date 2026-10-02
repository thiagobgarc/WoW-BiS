/**
 * GET /v1/character/:region/:realm/:name — the whole character screen in one
 * round trip. Rate limit: 20/60s per IP, matching /api/character and the
 * character page's own limiter.
 *
 * See composeCharacter.ts for why this is one request rather than five: it
 * returns exactly what the web app's character page composes server-side.
 */
import type { APIRoute } from 'astro';
import { composeCharacterResponse } from '@/lib/api/v1/composeCharacter';
import { toCharacterKey } from '@/lib/blizzard/getFullCharacter';
import { isValidRegion } from '@/lib/http/validateRegion';
import { toV1Error, v1ErrorResponse, v1Json, v1RateLimitGate } from '@/lib/http/v1';

export const prerender = false;

export const GET: APIRoute = async ({ params, clientAddress }) => {
  const { region, realm, name } = params as { region: string; realm: string; name: string };

  if (!isValidRegion(region)) {
    return v1ErrorResponse(400, 'invalid_region', `Unknown region "${region}".`);
  }

  const limited = await v1RateLimitGate('character', () => clientAddress, 20, 60);
  if (limited) return limited;

  try {
    return v1Json(await composeCharacterResponse(toCharacterKey(region, realm, name)));
  } catch (err) {
    const { status, body } = toV1Error(err);
    return v1Json(body, status);
  }
};
