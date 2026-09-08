/**
 * What the pure model can't prove: that the roster actually survives a
 * launch, and that a corrupt store degrades instead of crashing.
 *
 * MMKV is the in-memory stand-in from jest.setup.ts, which keeps the same
 * synchronous contract the real module has — the only property the store
 * depends on.
 */
import { recentStorage } from '@/lib/storage';
import type { RecentCharacter } from './model/recentCharacters';
import { DEFAULT_REGION, useRosterStore } from './store';

const STORAGE_KEY = 'mythos:recent-characters';

const ARTHAS: RecentCharacter = {
  name: 'Arthas',
  realmName: 'Illidan',
  realmSlug: 'illidan',
  region: 'us',
  className: 'Death Knight',
};

/**
 * A cold launch: empty memory, disk exactly as it was.
 *
 * The stored copy is captured and put back around the in-memory reset,
 * because `setState` itself persists — resetting the store first would
 * overwrite the very value the rehydrate is supposed to read, which is how
 * this helper was wrong the first time.
 */
function relaunch() {
  const stored = recentStorage.getString(STORAGE_KEY);
  useRosterStore.setState({ recent: [], region: DEFAULT_REGION });
  if (stored === undefined) recentStorage.remove(STORAGE_KEY);
  else recentStorage.set(STORAGE_KEY, stored);
  useRosterStore.persist.rehydrate();
}

beforeEach(() => {
  recentStorage.clearAll();
  useRosterStore.setState({ recent: [], region: DEFAULT_REGION });
});

describe('roster store', () => {
  it('writes a remembered character through to storage', () => {
    useRosterStore.getState().remember(ARTHAS);

    expect(useRosterStore.getState().recent).toEqual([ARTHAS]);
    expect(recentStorage.getString(STORAGE_KEY)).toContain('Arthas');
  });

  it('restores the roster on a cold launch', () => {
    useRosterStore.getState().remember(ARTHAS);

    relaunch();

    expect(useRosterStore.getState().recent).toEqual([ARTHAS]);
  });

  it('remembers the last region across launches', () => {
    useRosterStore.getState().setRegion('eu');

    relaunch();

    expect(useRosterStore.getState().region).toBe('eu');
  });

  it('falls back to the default region rather than trusting a bad stored one', () => {
    recentStorage.set(
      STORAGE_KEY,
      JSON.stringify({ state: { recent: [], region: 'moon' }, version: 1 }),
    );

    relaunch();

    expect(useRosterStore.getState().region).toBe(DEFAULT_REGION);
  });

  it('drops unreadable entries instead of failing to launch', () => {
    recentStorage.set(
      STORAGE_KEY,
      JSON.stringify({ state: { recent: [ARTHAS, { name: 'Broken' }] }, version: 1 }),
    );

    relaunch();

    expect(useRosterStore.getState().recent).toEqual([ARTHAS]);
  });

  it('survives a stored value that is not JSON at all', () => {
    recentStorage.set(STORAGE_KEY, 'not json');

    expect(() => relaunch()).not.toThrow();
    expect(useRosterStore.getState().recent).toEqual([]);
  });

  it('empties the roster and the stored copy with it', () => {
    useRosterStore.getState().remember(ARTHAS);
    useRosterStore.getState().forgetAll();

    expect(useRosterStore.getState().recent).toEqual([]);

    relaunch();
    expect(useRosterStore.getState().recent).toEqual([]);
  });

  it('keeps the region when the roster is cleared', () => {
    useRosterStore.getState().setRegion('kr');
    useRosterStore.getState().forgetAll();

    expect(useRosterStore.getState().region).toBe('kr');
  });
});
