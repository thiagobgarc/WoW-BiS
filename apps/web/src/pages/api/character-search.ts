/**
 * GET /api/character-search?q=arth&region=us — character-name autocomplete.
 * See lib/search/characterSearch.ts for the data source and ranking. Always
 * answers 200 with a (possibly empty) list: suggestions are a convenience,
 * and the form still works by typing the name and realm in full.
 */
import type { APIRoute } from 'astro';
import { rateLimit, clientIp } from '@/lib/http/rateLimit';
import { findCharacterSuggestions } from '@/lib/search/characterSearch';

export const prerender = false;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const q = url.searchParams.get('q') ?? '';
  const region = (url.searchParams.get('region') ?? '').toLowerCase() || undefined;

  const ip = clientIp(() => clientAddress);
  // Generous enough for fast typing (one request per debounced keystroke),
  // tight enough that this can't be used to proxy-scrape Raider.IO.
  const limit = await rateLimit(`character-search:${ip}`, 90, 60);
  if (!limit.allowed) {
    return json({ error: 'rate_limited', message: 'Too many requests — please slow down.' }, 429, {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  return json({ characters: await findCharacterSuggestions(q, region) });
};
