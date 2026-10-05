/**
 * Character-name autocomplete over GET /v1/character-search.
 *
 * Same shape as useRealmSuggestions, for the same reasons (no retries,
 * `keepPreviousData` so the list doesn't flicker out from under a thumb),
 * with two differences:
 *
 *  - **Matching ignores accents.** Players can rarely type their own name's
 *    "ó" on a phone keyboard, and Blizzard only finds a name spelled
 *    exactly. The query key is the accent-folded name, so "Zóe" and "zoe"
 *    share one cached answer, which the server returns for both anyway.
 *  - **The previous answer narrows while the next one loads.** Each
 *    keystroke filters what's already on screen down to what still matches,
 *    so the list sharpens instantly instead of waiting on the network.
 *
 * An hour's staleTime matches the server's cache: new characters reach the
 * upstream search over hours, not minutes. (Finite and well under the ~24
 * day timer ceiling AGENTS.md warns about.)
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Region } from '@mythos/api-contract';
import { foldName } from '@mythos/core/realm';

import { api } from '@/lib/api';
import { useDebouncedValue } from '../model/useDebouncedValue';

/** The server answers an empty list below this; don't ask. */
export const MIN_NAME_QUERY = 2;
const STALE_TIME = 60 * 60 * 1000;

export function useCharacterSuggestions(region: Region, query: string) {
  const debounced = useDebouncedValue(query.trim(), 180);
  const folded = foldName(debounced);
  const enabled = folded.length >= MIN_NAME_QUERY;

  const suggestions = useQuery({
    queryKey: ['character-search', region, folded],
    queryFn: ({ signal }) => api.searchCharacters({ q: debounced, region }, signal),
    enabled,
    staleTime: STALE_TIME,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const typed = foldName(query.trim());
  const live = typed.length >= MIN_NAME_QUERY;
  const fresh = !suggestions.isPlaceholderData && folded === typed;
  const characters = live
    ? (suggestions.data?.characters ?? []).filter((c) => fresh || foldName(c.name).includes(typed))
    : [];

  return {
    characters,
    /** Searching with nothing to show yet: worth one line of hint text. */
    isSearching: live && characters.length === 0 && (suggestions.isFetching || debounced !== query.trim()),
    /** Autocomplete is unavailable — a hint, never an error screen. */
    isUnavailable: suggestions.isError,
  };
}
