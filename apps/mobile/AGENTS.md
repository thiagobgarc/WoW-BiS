# Working in apps/mobile

**Expo changes fast. Read the versioned docs for the installed SDK —
https://docs.expo.dev/versions/v57.0.0/ — before writing code against it.**
The SDK version is in `package.json`; `README.md` records the whole resolved
stack.

Things that were true in an earlier SDK and are not true here, each of which
cost real time to rediscover:

- `Stack`, `Link` and `Tabs` all come from the `expo-router` root, but
  `expo-router`'s own `index.d.ts` is only `/// <reference>` lines — read
  `build/index.d.ts` to see what is actually exported.
- `react-native-mmkv` 4 has no `new MMKV()`. Instances come from
  `createMMKV({ id })`, and removal is `remove()`, not `delete()`. It is a
  Nitro module, so it does not run in Expo Go or under Jest — see
  `jest.setup.ts` for the stand-in.
- `render` from `@testing-library/react-native` is **async**. Await it, and
  take queries off the result; the `screen` singleton is not populated.
- Reanimated 4's Babel plugin is still reached at
  `react-native-reanimated/plugin`, which re-exports the worklets plugin.
- `newArchEnabled` is no longer a valid `app.config.ts` field.

Repo-specific rules:

- Files under `app/` are one-line re-exports of a screen in `src/features/`.
  expo-router builds a `require.context` over `app/`, so a colocated test
  file drags the testing library into the shipped bundle.
- Never hardcode a color. `src/theme/` owns them, and a test diffs the
  palette against `apps/web/src/styles/global.css`.
- The app talks to `/api/v1` only, through `@mythos/api-client`. It never
  reaches Blizzard, and it never bundles season data.
