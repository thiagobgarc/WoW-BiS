/**
 * GET /v1/realms?region=us&q=are — realm autocomplete.
 * Rate limit: 60/60s per IP.
 *
 * Same logic as the web app's /api/realms, in the /v1 envelope. The index
 * itself is cached 30 days server-side inside getRealmIndex(); a mobile
 * client persists the result for the same 30 days, which makes realm
 * autocomplete work fully offline after one fetch per region.
 */
import type { APIRoute } from 'astro';
import type { RealmsResponse } from '@mythos/api-contract';
import { getRealmIndex } from '@/lib/blizzard/client';
import { hasBlizzardCredentials } from '@/lib/blizzard/mock';
import { MOCK_REALMS } from '@/lib/blizzard/mockRealms';
import { isValidRegion } from '@/lib/http/validateRegion';
import { toV1Error, v1ErrorResponse, v1Json, v1RateLimitGate } from '@/lib/http/v1';

export const prerender = false;

/** An autocomplete query, not a search engine — bounds the substring scan. */
const MAX_QUERY_LENGTH = 32;
const MAX_MATCHES = 20;

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const region = url.searchParams.get('region') ?? 'us';
  const q = (url.searchParams.get('q') ?? '').toLowerCase().trim().slice(0, MAX_QUERY_LENGTH);

  if (!isValidRegion(region)) {
    return v1ErrorResponse(400, 'invalid_region', `Unknown region "${region}".`);
  }

  const limited = await v1RateLimitGate('realms', () => clientAddress, 60, 60);
  if (limited) return limited;

  try {
    const mock = !hasBlizzardCredentials();
    const names = mock ? MOCK_REALMS : (await getRealmIndex(region)).realms.map((r) => r.name);
    const matches = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;

    const body: RealmsResponse = { realms: matches.slice(0, MAX_MATCHES), mock };
    return v1Json(body);
  } catch (err) {
    const { status, body } = toV1Error(err);
    return v1Json(body, status);
  }
};
