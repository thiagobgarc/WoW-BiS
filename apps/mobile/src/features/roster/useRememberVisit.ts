/**
 * Records a character in the roster once it has actually resolved.
 *
 * The web adds to its recent list at *submit* time, inside the search form.
 * This app records at *resolve* time instead, on the character screen, for
 * two reasons the web doesn't have to care about:
 *
 *  1. Deep links. `mythos://character/us/illidan/arthas` and an https
 *     universal link both bypass the search screen entirely
 *     (mobile-ux.md, "Navigation shape"), so a submit-time hook would
 *     silently miss every character arrived at from outside the app.
 *  2. Canonical names. The response carries Blizzard's own capitalisation
 *     and realm name, so the roster stores "Kel'Thuzad" rather than whatever
 *     the user typed — which also makes dedup reliable, since two spellings
 *     of the same character resolve to one identical entry.
 *
 * A failed lookup records nothing, so the list can't fill up with typos.
 * A cached snapshot still counts as resolved: offline revisits keep the
 * roster ordered by when you actually looked, not by when the network
 * happened to be up.
 */
import { useEffect } from 'react';
import { RegionSchema } from '@mythos/api-contract';
import type { DomainCharacter } from '@mythos/core/character';

import { recentKey } from './model/recentCharacters';
import { useRememberCharacter } from './store';

export function useRememberVisit(character: DomainCharacter | undefined): void {
  const remember = useRememberCharacter();

  // `character` is a fresh object on every query re-render, so the effect
  // keys off the identity string instead — otherwise this would fire on
  // every background revalidation.
  const identity = character ? recentKey({ ...character, region: character.region.toLowerCase() }) : null;

  useEffect(() => {
    if (!character) return;

    // DomainCharacter types region as a plain string because that is what
    // Blizzard's payload is; the roster only stores regions the contract
    // recognises, so an unexpected one is skipped rather than stored.
    const region = RegionSchema.safeParse(character.region.toLowerCase());
    if (!region.success) return;

    remember({
      name: character.name,
      realmName: character.realmName,
      realmSlug: character.realmSlug,
      region: region.data,
      className: character.className || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by identity, see above
  }, [identity, character?.className, remember]);
}
