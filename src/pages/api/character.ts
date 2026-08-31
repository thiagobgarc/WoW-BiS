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

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const region = url.searchParams.get('region') ?? MOCK_CHARACTER_KEY.region;
  const realm = url.searchParams.get('realm') ?? MOCK_CHARACTER_KEY.realmSlug;
  const name = url.searchParams.get('name') ?? MOCK_CHARACTER_KEY.name;

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
