/**
 * What the banners above the character say, and when.
 *
 * Every screen in this app renders the last snapshot and revalidates behind
 * it (architecture.md Section 5), which means "the fetch failed" is usually
 * not an error state — it is a *freshness* state, and the difference is the
 * whole reason this is a function rather than three inline ternaries. An
 * error page over a perfectly good snapshot is the failure mode Phase 6's
 * exit criterion is written to prevent: airplane mode must still render the
 * character, with a banner that tells the truth about how old it is.
 *
 * Kept pure, so the wording is unit-testable against a fetchedAt the test
 * chooses rather than through a rendered screen.
 */
import { MythosApiError } from '@mythos/api-client';
import { timeAgo } from '@mythos/core/utils';

export type NoticeTone = 'info' | 'warning';

export interface SnapshotNotice {
  /** Stable key for the list, and what a test asserts on. */
  id: 'mock' | 'offline' | 'unreachable' | 'stale';
  tone: NoticeTone;
  message: string;
}

export interface SnapshotState {
  /** The server had no Blizzard credentials and served its sample character. */
  mock: boolean;
  /** The server could not reach Blizzard and served its own last good copy. */
  stale: boolean;
  fetchedAt: number;
  /** The failure from the current revalidation *or* refresh, if either failed. */
  error: unknown;
  /**
   * The OS's own answer, not an inference from a failed request.
   *
   * Without it, a cold launch in airplane mode inside `staleTime` refetches
   * nothing, has no error to report, and presents an hours-old snapshot as
   * though it were live — verified on a device in Phase 6, which is why this
   * field exists. Asking the platform is what lets the banner be honest
   * before anything has been attempted. See `lib/onlineStatus.ts`.
   */
  offline: boolean;
}

/**
 * Ordered most-actionable first. At most two ever appear: `mock` is about
 * the server's configuration and the freshness notice is about the data, so
 * they can be true at once and say different things. The freshness causes
 * are mutually exclusive — having no network explains any failure that
 * follows from it, and a request that failed on this device never carried a
 * `stale` flag from the server.
 */
export function snapshotNotices({
  mock,
  stale,
  fetchedAt,
  error,
  offline,
}: SnapshotState): SnapshotNotice[] {
  const notices: SnapshotNotice[] = [];
  // timeAgo reads the clock itself and floors at 'just now', so a snapshot
  // timestamped slightly in the future by clock skew reads as fresh, not negative.
  const age = timeAgo(fetchedAt);

  if (offline || (error instanceof MythosApiError && error.code === 'network')) {
    notices.push({
      id: 'offline',
      tone: 'warning',
      message: `You're offline — showing the snapshot from ${age}.`,
    });
  } else if (error !== null && error !== undefined) {
    notices.push({
      id: 'unreachable',
      tone: 'warning',
      message: `Couldn't refresh just now — showing the snapshot from ${age}.`,
    });
  } else if (stale) {
    notices.push({
      id: 'stale',
      tone: 'warning',
      message: `Blizzard is temporarily unavailable — showing the snapshot from ${age}.`,
    });
  }

  if (mock) {
    notices.push({
      id: 'mock',
      tone: 'info',
      message: 'Sample data — this server has no Blizzard credentials configured.',
    });
  }

  return notices;
}
