/**
 * GET /v1/character-search?q=zoe&region=us — character-name autocomplete.
 * Rate limit: 90/60s per IP.
 *
 * Same lookup as the web app's /api/character-search, in the /v1 envelope;
 * see lib/search/characterSearch.ts. Always 200 with a possibly empty list
 * once the request is valid: an outage of the upstream search reads as "no
 * suggestions", never as an error a phone would have to render.
 */
import type { APIRoute } from 'astro';
import type { CharacterSearchResponse } from '@mythos/api-contract';
import { isValidRegion } from '@/lib/http/validateRegion';
import { v1ErrorResponse, v1Json, v1RateLimitGate } from '@/lib/http/v1';
import { findCharacterSuggestions } from '@/lib/search/characterSearch';

export const prerender = false;

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const q = url.searchParams.get('q') ?? '';
  const region = url.searchParams.get('region') ?? undefined;

  if (region !== undefined && !isValidRegion(region)) {
    return v1ErrorResponse(400, 'invalid_region', `Unknown region "${region}".`);
  }

  // One request per debounced keystroke; matches the web route.
  const limited = await v1RateLimitGate('character-search', () => clientAddress, 90, 60);
  if (limited) return limited;

  const body: CharacterSearchResponse = { characters: await findCharacterSuggestions(q, region) };
  return v1Json(body);
};
