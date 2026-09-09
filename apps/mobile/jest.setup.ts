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

/**
 * expo-network reaches the platform's connectivity APIs, which do not exist
 * under Jest. The stand-in reports a connected device, so tests run in the
 * ordinary case; a test that needs the offline path drives TanStack's
 * `onlineManager` directly, which is what src/lib/onlineStatus.ts feeds and
 * what the UI actually reads.
 */
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

/**
 * @gorhom/bottom-sheet is a Reanimated component: what it actually does is
 * gestures, springs and layout, none of which Jest can observe and all of
 * which need a real device to judge. So it is replaced with plain Views that
 * render their children inline.
 *
 * The consequence is worth being clear about — **the sheet's presentation is
 * not covered by this suite.** What the mock preserves is the part that is
 * ours: which slot the screen decided to show. `SlotSheet` renders its body
 * only when a selection exists, so a test asserting on the body is still
 * asserting that the tap selected the right item, not that the mock renders
 * everything unconditionally.
 */
jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = require('react-native') as typeof import('react-native');
  const React = require('react') as typeof import('react');

  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    __esModule: true,
    default: passthrough,
    BottomSheetScrollView: passthrough,
    BottomSheetView: passthrough,
    BottomSheetBackdrop: () => null,
    useBottomSheetTimingConfigs: () => ({}),
  };
});
