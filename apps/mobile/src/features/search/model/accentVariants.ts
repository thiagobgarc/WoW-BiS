/**
 * The characters a not-found lookup most likely meant.
 *
 * Blizzard only finds a name spelled exactly, accents included, so "zoe" on
 * Eredar is a 404 even though "Zóe" lives there. These are the suggestions
 * on the same realm and region whose name is the typed one with accents put
 * back. Pure, so the rule is tested without a screen.
 */
import type { CharacterParams, CharacterSuggestion } from '@mythos/api-contract';
import { foldName, realmSlug } from '@mythos/core/realm';

export function accentVariants(suggestions: CharacterSuggestion[], looked: CharacterParams): CharacterSuggestion[] {
  const realm = realmSlug(looked.realm);
  const name = looked.name.toLowerCase();
  return suggestions.filter(
    (c) =>
      c.region === looked.region &&
      c.realmSlug === realm &&
      foldName(c.name) === foldName(name) &&
      c.name.toLowerCase() !== name,
  );
}
