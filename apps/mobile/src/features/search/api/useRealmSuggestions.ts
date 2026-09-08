/**
 * Realm autocomplete over GET /v1/realms.
 *
 * The application-layer hook for the `catalog` context (architecture.md
 * Section 3): a screen never calls the client directly, and never builds a
 * query key.
 *
 * Three things here are deliberate:
 *
 *  - **Long staleTime.** The server caches its realm index for 30 days
 *    inside `getRealmIndex()`; realms are added a handful of times a year.
 *    Refetching a prefix the user typed an hour ago would be pure waste.
 *  - **`keepPreviousData`.** Without it the list empties on every keystroke
 *    while the next request is in flight, which on a phone reads as the
 *    suggestions flickering out from under your thumb.
 *  - **No retries.** An autocomplete that fails is a non-event — the user
 *    can still type the realm and search. Retrying spends the rate limit on
 *    a request nobody is waiting for, and the failed state here is rendered
 *    as a hint, not an error.
 *
 * Offline behaviour falls out of the persisted query cache: any prefix
 * fetched before is answered from MMKV with no network at all. What is *not*
 * available offline is a prefix never typed on this device — the endpoint
 * caps a response at 20 matches, so there is no way to pull a whole region's
 * realm list down in one request and no full offline index to build from.
 * See architecture.md Section 10 for the follow-up that would fix it.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Region } from '@mythos/api-contract';

import { api } from '@/lib/api';
import { useDebouncedValue } from '../model/useDebouncedValue';

/**
 * Realm lists don't go stale on a clock — realms are added a handful of
 * times a year, and the server caches its index for 30 days anyway. What
 * actually bounds this data is the persisted cache's `maxAge` in
 * queryClient.ts, which drops everything a day after the app was last used.
 *
 * `Infinity` rather than "30 days in milliseconds", which is what this line
 * said first and was a bug: TanStack schedules the stale transition with
 * `setTimeout`, and both Node and Hermes clamp a delay past 2^31-1 ms
 * (~24.8 days) to 1ms and fire it immediately — so a 30-day staleTime
 * refetched on the very next tick, the exact opposite of how it read.
 * query-core's `isValidTimeout` excludes `Infinity` explicitly, so this
 * schedules no timer at all. Any *finite* staleTime here must stay under
 * ~24 days.
 */
const REALM_STALE_TIME = Infinity;

/** The endpoint's own cap; mirrored so the UI can say when it's truncating. */
export const MAX_SUGGESTIONS = 20;

export function useRealmSuggestions(region: Region, query: string) {
  const debounced = useDebouncedValue(query.trim(), 150);

  const suggestions = useQuery({
    queryKey: ['realms', region, debounced.toLowerCase()],
    queryFn: ({ signal }) => api.getRealms({ region, q: debounced }, signal),
    // One character is enough to be useful and cheap; zero would ask the
    // server for an arbitrary first-20 slice of the region, which is noise.
    enabled: debounced.length > 0,
    staleTime: REALM_STALE_TIME,
    retry: false,
    placeholderData: keepPreviousData,
  });

  return {
    realms: suggestions.data?.realms ?? [],
    /** True when the server has no Blizzard credentials and is serving samples. */
    isMock: suggestions.data?.mock ?? false,
    /** Autocomplete is unavailable — a hint, never an error screen. */
    isUnavailable: suggestions.isError,
    isPending: suggestions.isFetching && suggestions.data === undefined,
  };
}
