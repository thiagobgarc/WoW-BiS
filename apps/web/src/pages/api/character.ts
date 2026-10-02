/**
 * Phase 1 smoke-test endpoint: GET /api/character?region=us&realm=illidan&name=arthas
 * Defaults to the mock character key when no query params are given, so
 * `curl localhost:4321/api/character` works with zero setup.
 *
 * This mirrors exactly what the character page (Phase 2) renders — it's the
 * same getFullCharacter() call, just returned as JSON instead of HTML.
 */
import type { APIRoute } from 'astro';
import { getFullCharacter, toCharacterKey } from '@/lib/blizzard/getFullCharacter';
import { toApiError } from '@/lib/http/errorResponse';
import { MOCK_CHARACTER_KEY } from '@/lib/blizzard/mock';
import { isValidRegion } from '@/lib/http/validateRegion';
import { rateLimit, clientIp } from '@/lib/http/rateLimit';

export const prerender = false;

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const region = url.searchParams.get('region') ?? MOCK_CHARACTER_KEY.region;
  const realm = url.searchParams.get('realm') ?? MOCK_CHARACTER_KEY.realmSlug;
  const name = url.searchParams.get('name') ?? MOCK_CHARACTER_KEY.name;

  if (!isValidRegion(region)) {
    return new Response(JSON.stringify({ error: 'invalid_region', message: `Unknown region "${region}".` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = clientIp(() => clientAddress);
  const limit = await rateLimit(`character:${ip}`, 20, 60);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited', message: 'Too many requests — please slow down.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  const key = toCharacterKey(region, realm, name);

  try {
    const full = await getFullCharacter(key);
    return new Response(JSON.stringify(full), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }
};
