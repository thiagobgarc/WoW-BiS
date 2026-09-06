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
import { isValidRegion } from '@/lib/http/validateRegion';
import { rateLimit, clientIp } from '@/lib/http/rateLimit';

export const prerender = false;

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const region = url.searchParams.get('region') ?? 'us';
  // Capped at 32 chars — this is an autocomplete query, not a search
  // engine; nothing legitimate needs more, and it bounds the .includes()
  // scan below to a sane input size.
  const q = (url.searchParams.get('q') ?? '').toLowerCase().trim().slice(0, 32);

  if (!isValidRegion(region)) {
    return new Response(JSON.stringify({ error: 'invalid_region', message: `Unknown region "${region}".` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = clientIp(() => clientAddress);
  const limit = await rateLimit(`realms:${ip}`, 60, 60);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited', message: 'Too many requests — please slow down.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

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
