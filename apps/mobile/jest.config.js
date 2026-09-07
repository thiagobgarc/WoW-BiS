/**
 * jest-expo is the supported RN test path (architecture.md Section 7);
 * Vitest, which runs packages/*, cannot drive Metro or Hermes.
 *
 * transformIgnorePatterns is written as "ignore node_modules unless the path
 * mentions one of these packages anywhere" rather than the usual
 * "node_modules/(package|package)" form. Bun installs into a content-addressed
 * store, so React Native's own files live at
 * `node_modules/.bun/@react-native+jest-preset@0.86.3+<hash>/node_modules/@react-native/...`
 * and a pattern anchored to the first `node_modules/` segment sees `.bun`,
 * matches nothing in its allowlist, and skips transforming RN entirely —
 * which fails every suite at import time with "Must use import to load ES
 * Module". Matching anywhere in the path is what makes it work under Bun.
 *
 * The @mythos/* packages need no entry: Bun symlinks them to packages/*,
 * which resolves outside node_modules and is transformed as first-party
 * source.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*(?:react-native|@react-native|expo|@expo|@sentry|nativewind|react-native-css-interop|@shopify/flash-list|standard-navigation|@tanstack|yaml))',
  ],
  // The first suite in a cold run pays for transforming the React Native
  // tree; 5s is not enough for that on a laptop, and a timeout there looks
  // exactly like a hung query. Raised for headroom, not because anything
  // here is genuinely slow.
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
};
