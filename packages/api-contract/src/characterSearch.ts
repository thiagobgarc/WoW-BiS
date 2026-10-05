/**
 * GET /v1/character-search?q=zoe&region=us — character-name autocomplete.
 *
 * Blizzard has no search by name, so the server answers from Raider.IO's
 * site search, which matches without accents ("zoe" finds "Zóe"). That
 * source is undocumented, so this endpoint never fails on its account: an
 * outage is an empty `characters` list, and clients treat suggestions as a
 * convenience on top of typing the name and realm in full.
 *
 * `region` is optional and only orders the results (its characters first);
 * every region a character page can open may appear. A `q` shorter than two
 * letters, accents aside, always answers an empty list.
 */
import { z } from 'zod';
import { RegionSchema } from './common';

export const CharacterSuggestionSchema = z.object({
  /** Exactly as Blizzard spells it, accents included. */
  name: z.string(),
  realmName: z.string(),
  /** Blizzard's slug, ready for /v1/character/:region/:realm/:name. */
  realmSlug: z.string(),
  region: RegionSchema,
  className: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type CharacterSuggestion = z.infer<typeof CharacterSuggestionSchema>;

export const CharacterSearchResponseSchema = z.object({
  characters: z.array(CharacterSuggestionSchema),
});
export type CharacterSearchResponse = z.infer<typeof CharacterSearchResponseSchema>;
