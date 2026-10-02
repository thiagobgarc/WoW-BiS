/**
 * POST /v1/character/:region/:realm/:name/refresh — cache-bypassing refetch.
 * Rate limit: 10/60s per IP, on top of refreshCharacter's own 60s
 * per-character cooldown.
 *
 * Those two limits are deliberately not stacked into one: the IP limit stops
 * a client hammering the endpoint across many characters, and the
 * per-character cooldown (owned by refreshCharacter, not re-implemented
 * here) stops repeated refreshes of the same character from reaching
 * Blizzard. A 429 from either carries retryAfterSeconds so the client can
 * schedule rather than guess.
 *
 * Every POST here must carry `Content-Type: application/json` even though it
 * has no body: Astro's CSRF check rejects a form-shaped or content-type-less
 * POST that has no matching Origin header, and a native client sends no
 * Origin. See JSON_CONTENT_TYPE in @mythos/api-contract.
 *
 * On success this returns the full character payload, not just an ack — a
 * client that just invalidated its cache needs the new snapshot, and making
 * it follow up with a GET would cost a second round trip for data the
 * server has already warmed.
 */
import type { APIRoute } from 'astro';
import { composeCharacterResponse } from '@/lib/api/v1/composeCharacter';
import { refreshCharacter } from '@/lib/blizzard/client';
import { toCharacterKey } from '@/lib/blizzard/getFullCharacter';
import { isValidRegion } from '@/lib/http/validateRegion';
import { toV1Error, v1ErrorBody, v1ErrorResponse, v1Json, v1RateLimitGate } from '@/lib/http/v1';

export const prerender = false;

export const POST: APIRoute = async ({ params, clientAddress }) => {
  const { region, realm, name } = params as { region: string; realm: string; name: string };

  if (!isValidRegion(region)) {
    return v1ErrorResponse(400, 'invalid_region', `Unknown region "${region}".`);
  }

  const limited = await v1RateLimitGate('character-refresh', () => clientAddress, 10, 60);
  if (limited) return limited;

  const key = toCharacterKey(region, realm, name);

  try {
    const result = await refreshCharacter(key);
    if (!result.ok) {
      return v1Json(
        {
          ...v1ErrorBody('rate_limited', 'This character was refreshed a moment ago — try again shortly.'),
          retryAfterSeconds: result.retryAfterSeconds,
        },
        429,
        { 'Retry-After': String(result.retryAfterSeconds) },
      );
    }

    return v1Json(await composeCharacterResponse(key));
  } catch (err) {
    const { status, body } = toV1Error(err);
    return v1Json(body, status);
  }
};
