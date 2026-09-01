/**
 * GET /api/realms?region=us&q=are — realm autocomplete data source.
 * Cached 30 days server-side inside getRealmIndex(); this route just
 * filters the (large) index down to a client-friendly matches list.
 */
import type { APIRoute } from 'astro';
import { getRealmIndex } from '@/lib/blizzard/client';
import { hasBlizzardCredentials } from '@/lib/blizzard/mock';
import { MOCK_REALMS } from '@/lib/blizzard/mockRealms';
import { toApiError } from '@/lib/http/errorResponse';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const region = url.searchParams.get('region') ?? 'us';
  const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();

  try {
    const names = hasBlizzardCredentials()
      ? (await getRealmIndex(region)).realms.map((r) => r.name)
      : MOCK_REALMS;

    const matches = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;

    return new Response(JSON.stringify({ realms: matches.slice(0, 20), mock: !hasBlizzardCredentials() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }
};
