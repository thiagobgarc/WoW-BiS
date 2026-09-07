/**
 * TanStack Query, configured to match the semantics the server already has.
 *
 * `/v1/character/...` returns a snapshot with a `stale` flag rather than
 * blocking on Blizzard (architecture.md Section 5), so the client's job is
 * to show that snapshot instantly and revalidate behind it — which is
 * stale-while-revalidate, which is Query's default behaviour once the cache
 * survives a cold start. Hence the MMKV persister: without it every launch
 * is an empty cache and the snapshot semantics buy nothing.
 */
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { MythosApiError } from '@mythos/api-client';
import { querySyncStorage } from './storage';

/** Anything older than this is dropped rather than shown. */
const ONE_DAY = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long enough that switching tabs never refetches, short enough that
      // returning to a character after a raid night does.
      staleTime: 1000 * 60 * 5,
      gcTime: ONE_DAY,
      // Must not exceed gcTime or the persisted entry outlives its cache.
      retry: (failureCount, error) => {
        // The server already says whether a failure is worth retrying;
        // guessing from the status code here would contradict it.
        if (error instanceof MythosApiError) return error.retryable && failureCount < 2;
        return failureCount < 2;
      },
      refetchOnReconnect: true,
    },
  },
});

export const queryPersister = createSyncStoragePersister({
  storage: querySyncStorage,
  key: 'mythos.query.cache',
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: ONE_DAY,
  /**
   * Bump when a cached payload shape changes. A persisted cache from an
   * older build is restored *before* any schema check runs, so without this
   * an app update can hand last week's shape to this week's components.
   * The api-client re-validates on every fetch; this covers the gap before
   * the first fetch returns.
   */
  buster: 'v1',
};
