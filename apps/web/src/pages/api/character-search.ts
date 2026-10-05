/**
 * GET /api/character-search?q=arth&region=us — character-name autocomplete.
 * See lib/search/characterSearch.ts for the data source and ranking. Always
 * answers 200 with a (possibly empty) list: suggestions are a convenience,
 * and the form still works by typing the name and realm in full.
 */
import type { APIRoute } from 'astro';
import { getCache } from '@/lib/cache/cache';
import { rateLimit, clientIp } from '@/lib/http/rateLimit';
import { foldName, rankSuggestions, searchCharacters, type CharacterSuggestion } from '@/lib/search/characterSearch';

export const prerender = false;

/** Below two letters a search matches half the game and helps no one. */
const MIN_QUERY = 2;
/** WoW names are at most 12 characters; a little slack for typos. */
const MAX_QUERY = 24;
const MAX_RESULTS = 8;
/** New characters appear on Raider.IO over hours, not minutes. */
const CACHE_SECONDS = 60 * 60;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY);
  const region = (url.searchParams.get('region') ?? '').toLowerCase() || undefined;
  if (foldName(q).length < MIN_QUERY) return json({ characters: [] });

  const ip = clientIp(() => clientAddress);
  // Generous enough for fast typing (one request per debounced keystroke),
  // tight enough that this can't be used to proxy-scrape Raider.IO.
  const limit = await rateLimit(`character-search:${ip}`, 90, 60);
  if (!limit.allowed) {
    return json({ error: 'rate_limited', message: 'Too many requests — please slow down.' }, 429, {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  // Raider.IO matches without accents, so "Zòë" and "zoe" share one entry.
  const cache = getCache();
  const key = `character-search:${foldName(q)}`;
  let found = await cache.get<CharacterSuggestion[]>(key);
  if (!found) {
    found = await searchCharacters(q);
    // An empty list may be an outage rather than a real miss: don't pin it.
    if (found.length > 0) await cache.set(key, found, CACHE_SECONDS);
  }

  return json({ characters: rankSuggestions(found, q, region).slice(0, MAX_RESULTS) });
};
