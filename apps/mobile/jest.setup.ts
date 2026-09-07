/**
 * MMKV is a Nitro (native) module with no JS fallback, so it cannot load
 * under Jest at all. This in-memory stand-in keeps the same synchronous
 * contract the real one has — which is the property src/lib/storage.ts
 * depends on, so a test that passes here is testing the right shape.
 */
jest.mock('react-native-mmkv', () => {
  function createMMKV() {
    const store = new Map<string, string | number | boolean>();

    return {
      getString: (key: string) => {
        const value = store.get(key);
        return typeof value === 'string' ? value : undefined;
      },
      set: (key: string, value: string | number | boolean) => {
        store.set(key, value);
      },
      remove: (key: string) => store.delete(key),
      contains: (key: string) => store.has(key),
      clearAll: () => store.clear(),
      getAllKeys: () => [...store.keys()],
    };
  }

  return { createMMKV };
});

/** No DSN in tests, so init is already a no-op; wrap must stay identity. */
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component: unknown) => component,
  captureException: jest.fn(),
}));
