import { MythosApiError } from '@mythos/api-client';

import { snapshotNotices } from './snapshot';

const MINUTE = 60_000;
const fresh = () => Date.now();
const anHourAgo = () => Date.now() - 60 * MINUTE;

const clean = { mock: false, stale: false, error: null, offline: false };

describe('snapshotNotices', () => {
  it('says nothing about a fresh, live, real snapshot', () => {
    expect(snapshotNotices({ ...clean, fetchedAt: fresh() })).toEqual([]);
  });

  it('names offline specifically, because the fix is different', () => {
    const error = new MythosApiError({ code: 'network', message: 'no' });
    const [notice] = snapshotNotices({ ...clean, error, fetchedAt: anHourAgo() });

    expect(notice?.id).toBe('offline');
    expect(notice?.tone).toBe('warning');
    // The age is the whole point of the banner — a snapshot with no stated
    // age is indistinguishable from live data.
    expect(notice?.message).toContain('1 hour ago');
  });

  it('falls back to a generic refresh failure for any other error', () => {
    const error = new MythosApiError({ code: 'blizzard_error', message: 'nope' });
    const [notice] = snapshotNotices({ ...clean, error, fetchedAt: anHourAgo() });

    expect(notice?.id).toBe('unreachable');
    // Never the server's own message: api-contract.md says messages are copy
    // and may change freely, so nothing is built on their wording.
    expect(notice?.message).not.toContain('nope');
  });

  it("reports the server's stale flag when our own request succeeded", () => {
    const [notice] = snapshotNotices({ ...clean, stale: true, fetchedAt: anHourAgo() });

    expect(notice?.id).toBe('stale');
    expect(notice?.message).toContain('Blizzard');
  });

  it('prefers our own failure over the flag from the last good response', () => {
    // Both can be set at once after a stale payload is cached and the next
    // revalidation fails. What is true *now* is that this device is offline.
    const error = new MythosApiError({ code: 'network', message: 'no' });
    const ids = snapshotNotices({ ...clean, stale: true, error, fetchedAt: fresh() }).map((n) => n.id);

    expect(ids).toEqual(['offline']);
  });

  it('stacks the mock notice under the freshness one', () => {
    const error = new MythosApiError({ code: 'network', message: 'no' });
    const ids = snapshotNotices({ ...clean, mock: true, error, fetchedAt: fresh() }).map((n) => n.id);

    // Freshness first: it is the one that explains what is on screen.
    expect(ids).toEqual(['offline', 'mock']);
  });

  it('says you are offline before any request has been tried', () => {
    // The cold-launch-in-airplane-mode case: nothing has failed, because
    // nothing was attempted. The platform is the only source that knows.
    const [notice] = snapshotNotices({ ...clean, offline: true, fetchedAt: anHourAgo() });

    expect(notice?.id).toBe('offline');
    expect(notice?.message).toContain('1 hour ago');
  });

  it('prefers being offline over the server-side stale flag', () => {
    const ids = snapshotNotices({ ...clean, offline: true, stale: true, fetchedAt: fresh() }).map((n) => n.id);

    expect(ids).toEqual(['offline']);
  });

  it('reports sample data on its own', () => {
    const [notice] = snapshotNotices({ ...clean, mock: true, fetchedAt: fresh() });

    expect(notice?.id).toBe('mock');
    expect(notice?.tone).toBe('info');
  });

  it('reads a clock-skewed future timestamp as fresh, not as negative time', () => {
    const [notice] = snapshotNotices({
      ...clean,
      stale: true,
      fetchedAt: Date.now() + 10 * MINUTE,
    });

    expect(notice?.message).toContain('just now');
  });
});
