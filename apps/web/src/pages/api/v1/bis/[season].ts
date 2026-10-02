/**
 * GET /v1/bis/:season?class=&spec= — the season's BiS seed data.
 * Rate limit: 60/60s per IP.
 *
 * Two modes, one response shape: no class/spec returns every seeded spec
 * (the offline-prefetch case), class+spec returns just that one. Filtering
 * an array rather than switching shapes means a client has one parser and
 * one cache-entry format either way.
 *
 * Conditional GET is the point of this endpoint's `version`: the full
 * season payload is by far the largest thing /v1 serves, and a client that
 * prefetches it on every launch should be paying for one ETag round trip,
 * not a re-download of unchanged seed data.
 */
import { createHash } from 'node:crypto';
import type { APIRoute } from 'astro';
import type { BisSeasonResponse, BisSpec } from '@mythos/api-contract';
import { getBisSeason } from '@/lib/bis/getBisSeason';
import { toV1Error, v1Json, v1RateLimitGate } from '@/lib/http/v1';

export const prerender = false;

/** Short hash of the seed content — long enough not to collide in practice. */
function contentVersion(specs: BisSpec[]): string {
  return createHash('sha256').update(JSON.stringify(specs)).digest('hex').slice(0, 16);
}

export const GET: APIRoute = async ({ params, url, clientAddress, request }) => {
  const season = params.season!;

  const limited = await v1RateLimitGate('bis', () => clientAddress, 60, 60);
  if (limited) return limited;

  try {
    const all = await getBisSeason(season);

    // The version covers the whole season, not the filtered subset, so a
    // client's ETag stays valid across both modes of this endpoint.
    const version = contentVersion(all);
    const etag = `"${version}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    const className = url.searchParams.get('class');
    const spec = url.searchParams.get('spec');
    const specs =
      className && spec
        ? all.filter((s) => s.class.toLowerCase() === className.toLowerCase() && s.spec.toLowerCase() === spec.toLowerCase())
        : all;

    const body: BisSeasonResponse = { season, version, specs };
    return v1Json(body, 200, { ETag: etag });
  } catch (err) {
    const { status, body } = toV1Error(err);
    return v1Json(body, status);
  }
};
