/**
 * GET /v1/character/:region/:realm/:name — the whole screen in one request.
 *
 * The application-layer hook for the `character` context (architecture.md
 * Section 3): screens don't call the client and don't build query keys.
 * Both tabs, the paper doll, the stats panel and Phase 7's upgrade board all
 * read from this one entry, which is the "one round trip" rule in
 * api-contract.md — switching tabs must never produce a spinner, and it
 * can't if there is nothing left to fetch.
 *
 * A deep link can carry any string, including one from a future build, so
 * the region is narrowed here rather than on the wire: an unknown region
 * becomes a rendered message instead of a round trip the server has to
 * reject with `invalid_region`.
 */
import { useQuery } from '@tanstack/react-query';
import { RegionSchema, type CharacterParams, type Region } from '@mythos/api-contract';

import { api } from '@/lib/api';

/**
 * The one place this key is spelled. `useRefreshCharacter` writes the
 * refreshed payload straight into it, and a key written twice is a cache
 * that silently splits in two.
 */
export function characterQueryKey(region: Region, realm: string, name: string) {
  // Realm and name come from a URL the user (or a link) supplied and are
  // matched case-insensitively by the server, so /us/illidan/arthas and
  // /us/Illidan/Arthas must not be two cache entries with two snapshots.
  return ['character', region, realm.toLowerCase(), name.toLowerCase()] as const;
}

export interface CharacterRouteParams {
  region: string | undefined;
  realm: string | undefined;
  name: string | undefined;
}

/** Narrows raw route params to something the client can be handed, or null. */
export function parseCharacterParams({ region, realm, name }: CharacterRouteParams): CharacterParams | null {
  const parsed = RegionSchema.safeParse(region?.toLowerCase());
  if (!parsed.success || !realm || !name) return null;
  return { region: parsed.data, realm, name };
}

export function useCharacter(params: CharacterParams | null) {
  return useQuery({
    queryKey: params
      ? characterQueryKey(params.region, params.realm, params.name)
      : ['character', 'unsupported'],
    queryFn: ({ signal }) => {
      // Unreachable while `enabled` is false; present so queryFn is total.
      if (!params) throw new Error('No character to load');
      return api.getCharacter(params, signal);
    },
    enabled: params !== null,
  });
}
