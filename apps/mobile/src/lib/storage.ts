/**
 * MMKV instances.
 *
 * Two stores, not one, because they have different lifetimes: the query
 * cache is disposable (clearing it costs a refetch) while `recent` holds
 * the user's recent-character list, which is the only thing in the app a
 * person would miss. Separating them means "clear the cache" can never
 * take the recents with it.
 *
 * MMKV 4 is a Nitro module, so it does not run in Expo Go — the app needs a
 * development build. That is already the plan (eas.json's `development`
 * profile), but it is the first thing that bites when someone reaches for
 * Expo Go out of habit. It also changed the API from v3: instances come
 * from `createMMKV()` rather than `new MMKV()`, and removal is `remove()`,
 * not `delete()`.
 */
import { createMMKV } from 'react-native-mmkv';

export const queryStorage = createMMKV({ id: 'mythos.query' });
export const recentStorage = createMMKV({ id: 'mythos.recent' });

/**
 * The shape TanStack's sync persister expects. MMKV is synchronous, which
 * is the reason it was chosen over AsyncStorage here — the persisted cache
 * is restored before the first render instead of one frame after it.
 */
export const querySyncStorage = {
  getItem: (key: string) => queryStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => queryStorage.set(key, value),
  removeItem: (key: string) => {
    queryStorage.remove(key);
  },
};
