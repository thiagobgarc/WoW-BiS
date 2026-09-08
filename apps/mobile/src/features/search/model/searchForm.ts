/**
 * The search form's rules, with no React in them.
 *
 * Slugging happens here, once, using @mythos/core's `realmSlug` and
 * `characterSlug` — the same functions apps/web's SearchForm calls, and the
 * reason they were moved into core in Phase 2. A phone must produce byte
 * identical URLs to the web for the same input, or a shared link and an
 * in app search reach different cache entries for the same character.
 */
import { characterSlug, realmSlug } from '@mythos/core/realm';
import type { Region } from '@mythos/api-contract';

/**
 * Both fields, non-empty. Deliberately *not* "and the realm matches a
 * suggestion": autocomplete is a convenience that needs the network, and
 * gating the button on it would make the screen unusable offline — which is
 * exactly what this phase's exit criterion forbids. A realm that doesn't
 * exist fails at the character screen with a real error, which is where
 * every other lookup failure already surfaces.
 */
export function canSearch(name: string, realm: string): boolean {
  return name.trim().length > 0 && realm.trim().length > 0;
}

export interface CharacterRoute {
  pathname: '/character/[region]/[realm]/[name]';
  params: { region: Region; realm: string; name: string };
}

/** The typed expo-router target for a lookup. */
export function characterRoute(region: Region, realm: string, name: string): CharacterRoute {
  return {
    pathname: '/character/[region]/[realm]/[name]',
    params: { region, realm: realmSlug(realm), name: characterSlug(name) },
  };
}
