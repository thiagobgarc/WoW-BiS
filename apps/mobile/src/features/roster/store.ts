/**
 * The roster store — Zustand over MMKV.
 *
 * architecture.md Section 7 scopes Zustand to "roster only", and Section 9.1
 * held it back until there was global state to justify it. There is now: the
 * recent list is written on the character screen and read on the search
 * screen, which are different branches of the navigation tree, and the last
 * used region has to outlive the search screen's unmount. Neither is server
 * state, so neither belongs in TanStack Query.
 *
 * Persistence is MMKV rather than the query persister on purpose. Section 6
 * of storage.ts already separates the two stores by lifetime: the query
 * cache is disposable and expires after a day, while the roster is the only
 * thing here a person would miss. It gets its own store, its own key, and no
 * expiry.
 *
 * MMKV being synchronous is what makes `persist` rehydrate during store
 * creation rather than a frame later, so the search screen's first render
 * already has the recents. An async storage would flash an empty list.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { RegionSchema, type Region } from '@mythos/api-contract';

import { recentStorage } from '@/lib/storage';
import { addRecent, parseRecentList, type RecentCharacter } from './model/recentCharacters';

/** Same key the web uses in localStorage — different store, one vocabulary. */
const STORAGE_KEY = 'mythos:recent-characters';

/** Where a cold launch starts before anyone has searched. */
export const DEFAULT_REGION: Region = 'us';

interface RosterState {
  recent: RecentCharacter[];
  /** The last region searched, so the picker doesn't reset to US every launch. */
  region: Region;
  remember: (entry: RecentCharacter) => void;
  setRegion: (region: Region) => void;
  /** Backs Settings' "clear recent characters". */
  forgetAll: () => void;
}

const mmkvStorage = createJSONStorage<Pick<RosterState, 'recent' | 'region'>>(() => ({
  getItem: (key) => recentStorage.getString(key) ?? null,
  setItem: (key, value) => recentStorage.set(key, value),
  removeItem: (key) => {
    recentStorage.remove(key);
  },
}));

export const useRosterStore = create<RosterState>()(
  persist(
    (set) => ({
      recent: [],
      region: DEFAULT_REGION,
      remember: (entry) => set((state) => ({ recent: addRecent(state.recent, entry) })),
      setRegion: (region) => set({ region }),
      forgetAll: () => set({ recent: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: mmkvStorage,
      /** Actions are recreated on every launch; only the data is persisted. */
      partialize: (state) => ({ recent: state.recent, region: state.region }),
      /**
       * The boundary check. Anything restored from disk is untrusted input
       * from a build that may be years older than this one, so it goes
       * through the same Zod parse a network response would — see
       * parseRecentList's note on why bad entries are dropped one at a time.
       */
      merge: (persisted, current) => {
        const stored = persisted as Partial<Pick<RosterState, 'recent' | 'region'>> | undefined;
        return {
          ...current,
          recent: parseRecentList(stored?.recent),
          region: RegionSchema.catch(current.region).parse(stored?.region),
        };
      },
    },
  ),
);

/**
 * Selector hooks rather than raw store access at call sites, so a component
 * re-renders for the slice it actually reads. Zustand returns stable
 * references for both the array and each action, so these don't churn.
 */
export const useRecentCharacters = () => useRosterStore((state) => state.recent);
export const useRegion = () => useRosterStore((state) => state.region);
export const useSetRegion = () => useRosterStore((state) => state.setRegion);
export const useRememberCharacter = () => useRosterStore((state) => state.remember);
export const useForgetAllCharacters = () => useRosterStore((state) => state.forgetAll);
