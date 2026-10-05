/**
 * Character-name suggestions for the home page search.
 *
 * Blizzard's API has no search-by-name (only exact name + realm lookups),
 * so names come from Raider.IO's site search, the endpoint behind the
 * search bar on raider.io. It is not part of their documented API, so
 * everything here treats it as optional: a failure, a timeout or a changed
 * shape yields no suggestions, never an error, and the dropdown falls back
 * to the recently viewed characters.
 *
 * Its matching is accent-insensitive ("zoe" finds "Zòë"), which is what
 * makes it worth using: most players can't type their own name's accents.
 */
import { z } from 'zod';
import type { CharacterSuggestion, Region } from '@mythos/api-contract';
import { foldName, realmSlug } from '@mythos/core/realm';
import { getCache } from '@/lib/cache/cache';

export { foldName };
export type { CharacterSuggestion };

/** China's armory isn't on Blizzard's global API, so its characters can't open. */
const REGIONS = new Set<string>(['us', 'eu', 'kr', 'tw'] satisfies Region[]);

const MatchSchema = z
  .object({
    type: z.string(),
    name: z.string(),
    data: z
      .object({
        region: z.object({ slug: z.string() }).loose(),
        realm: z.object({ name: z.string() }).loose(),
        class: z.object({ name: z.string() }).loose().nullish(),
        thumbnail_url: z.string().nullish(),
      })
      .loose()
      .optional(),
  })
  .loose();

const ResponseSchema = z.object({ matches: z.array(z.unknown()) }).loose();

/** Raider.IO's raw search response, reduced to the characters we can open. */
export function parseSearchResponse(raw: unknown): CharacterSuggestion[] {
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return [];

  return parsed.data.matches.flatMap((entry) => {
    const match = MatchSchema.safeParse(entry);
    if (!match.success || match.data.type !== 'character' || !match.data.data) return [];
    const { region, realm, class: wowClass, thumbnail_url } = match.data.data;
    if (!REGIONS.has(region.slug)) return [];
    return [
      {
        name: match.data.name,
        realmName: realm.name,
        // Raider.IO's own realm slug differs from Blizzard's for some
        // connected realms ("connected-arthas"), and the character page
        // speaks Blizzard's, so it's derived from the name like every
        // other realm in the app.
        realmSlug: realmSlug(realm.name),
        region: region.slug as Region,
        className: wowClass?.name ?? null,
        // Protocol-relative ("//render.worldofwarcraft.com/..."), and the
        // ?alt= fallback points at a path on worldofwarcraft.com, which
        // doesn't resolve from our origin, so it's dropped.
        avatarUrl: thumbnail_url ? `https:${thumbnail_url.split('?')[0]}` : null,
      },
    ];
  });
}

/**
 * Orders suggestions so the list sharpens with every keystroke: an exact
 * name first, then names that start with the query, then names that merely
 * contain it, then anything Raider.IO matched more loosely. Within each
 * band the region the user picked comes first, and Raider.IO's own order
 * (which favours active characters) breaks the remaining ties.
 */
export function rankSuggestions(list: CharacterSuggestion[], query: string, region?: string): CharacterSuggestion[] {
  const q = foldName(query.trim());
  const band = (s: CharacterSuggestion) => {
    const name = foldName(s.name);
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    return 3;
  };
  return list
    .map((s, i) => ({ s, i, band: band(s), away: region && s.region !== region ? 1 : 0 }))
    .sort((a, b) => a.band - b.band || a.away - b.away || a.i - b.i)
    .map(({ s }) => s);
}

const SEARCH_TIMEOUT_MS = 3000;

export async function searchCharacters(query: string): Promise<CharacterSuggestion[]> {
  try {
    const res = await fetch(`https://raider.io/api/search?term=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mythos (https://mythosbis.com)' },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    return parseSearchResponse(await res.json());
  } catch {
    return [];
  }
}

/** Below two letters a search matches half the game and helps no one. */
export const MIN_QUERY = 2;
/** WoW names are at most 12 characters; a little slack for typos. */
export const MAX_QUERY = 24;
const MAX_RESULTS = 8;
/** New characters appear on Raider.IO over hours, not minutes. */
const CACHE_SECONDS = 60 * 60;

/**
 * The whole lookup both routes serve (/api/character-search for the web,
 * /api/v1/character-search for the app): bounded query, cached per
 * accent-folded query, ranked for the caller's region, capped.
 */
export async function findCharacterSuggestions(rawQuery: string, region?: string): Promise<CharacterSuggestion[]> {
  const q = rawQuery.trim().slice(0, MAX_QUERY);
  if (foldName(q).length < MIN_QUERY) return [];

  // Raider.IO matches without accents, so "Zòë" and "zoe" share one entry.
  const cache = getCache();
  const key = `character-search:${foldName(q)}`;
  let found = await cache.get<CharacterSuggestion[]>(key);
  if (!found) {
    found = await searchCharacters(q);
    // An empty list may be an outage rather than a real miss: don't pin it.
    if (found.length > 0) await cache.set(key, found, CACHE_SECONDS);
  }
  return rankSuggestions(found, q, region).slice(0, MAX_RESULTS);
}
