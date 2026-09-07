# Mythos Mobile

The React Native client for Mythos. It shares no UI with `apps/web` — what
the two share is `@mythos/core` (domain logic), `@mythos/api-contract` (wire
schemas) and `@mythos/api-client` (typed fetch client). Everything this app
knows about a character arrives over `/api/v1`, served by `apps/web`.

See `docs/architecture.md` for why the split is drawn there, and
`docs/mobile-ux.md` for the screen-by-screen plan.

## Resolved versions

`architecture.md` Section 7 says to resolve the stack at install time rather
than pin from memory, and to record what came out. Installed 2026-09-07:

| Package | Range | Resolved |
|---|---|---|
| expo | `~57.0.20` | 57.0.20 |
| react-native | `0.86.3` | 0.86.3 |
| react | `19.2.3` | 19.2.3 |
| expo-router | `~57.0.19` | 57.0.19 |
| nativewind | `4.2.6` | 4.2.6 |
| tailwindcss | `^3.4.0` | 3.4.19 |
| @tanstack/react-query | `^5.102.8` | 5.102.8 |
| react-native-mmkv | `^4.3.2` | 4.3.2 |
| @sentry/react-native | `~7.11.0` | 7.11.0 |
| @shopify/flash-list | `2.0.2` | 2.0.2 |
| expo-image | `~57.0.4` | 57.0.4 |
| react-native-reanimated | `4.5.1` | 4.5.1 |
| zod | `^4.5.4` | 4.5.4 |
| jest-expo | `^57.0.5` | 57.0.5 |
| typescript | `~6.0.3` | 6.0.3 |

`npx expo-doctor` passes 21/21 at these versions.

### Version decisions worth knowing

- **NativeWind 4 pins mobile to Tailwind v3** while `apps/web` is on Tailwind
  v4. NativeWind 4's `react-native-css-interop` peer-depends on
  `tailwindcss: ~3`; NativeWind 5, which targets Tailwind v4, was still a
  preview release. The two apps never share a stylesheet — only the token
  values in `src/theme/palette.json`, which `src/theme/tokens.test.ts` checks
  against the web's `global.css` on every run. Converging on NativeWind 5 is
  a later chore, not a v1 blocker.
- **React is pinned to the exact version Expo tested with (19.2.3), in both
  apps.** `apps/web` previously floated on `^19.2.8`, which put two copies of
  React in the tree. Two Reacts is the "Invalid hook call" failure mode, and
  the tree is the thing EAS builds from. Web takes React patches on the
  Expo SDK's cadence now; that is the trade.
- **Bun's linker is `hoisted`** (`bunfig.toml` at the repo root). Babel
  resolves presets and plugins by name from the config's directory, and
  Bun's default isolated layout hides them — both Metro and jest-expo fail
  with "Cannot find module '@babel/plugin-transform-react-jsx'" for a
  package that is installed. `apps/web` is indifferent; `apps/mobile` cannot
  build without it.
- **Jest 29, not 30**, because that is what `npx expo install --check`
  expects for this SDK. Jest 29 cannot `require()` an ES module, which
  `src/lib/metro.test.ts` needs in order to load the real Metro config, so
  `yaml` is listed in `transformIgnorePatterns` for Babel to transpile.

## Running it

The app needs a **development build**, not Expo Go: `react-native-mmkv` 4 is
a Nitro module with no JS fallback, so Expo Go cannot load it.

```bash
# One time per machine (and after adding any native module):
bun run --cwd apps/mobile android      # or `expo run:ios` on a Mac

# Day to day:
bun run mobile                         # Metro, from the repo root
```

The app talks to `/api/v1` on the web app. In development it takes the host
from the Metro connection and swaps the port to 4321, so nothing needs
configuring — but **the web dev server has to be listening on that host**,
not only on loopback:

```bash
bun run dev:host                       # astro dev --host
```

Plain `bun run dev` binds 127.0.0.1, which an emulator cannot reach: the app
resolves `http://10.0.2.2:4321` (the emulator's alias for the host machine)
and the connection is refused. The symptom is the Search screen showing
`code: network` with the resolved base URL printed directly above it — that
line exists to make this exact mistake self-diagnosing, and Metro also logs
`[mythos] API base URL: …` on every start.

With no `BLIZZARD_CLIENT_ID` in `apps/web/.env`, the web app serves fixture
data and the whole mobile app works offline from real infrastructure.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_MYTHOS_API_URL` | EAS build profile | The web app's origin. Required for preview and production builds; inferred from Metro in development. |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS build profile | Crash reporting. Sentry does not initialise without it. |
| `MYTHOS_WEB_HOST` | EAS build profile | Bare host (no scheme) for universal/app links onto `/character/*`. Omitted, the app still handles `mythos://` links. |
| `SENTRY_ORG`, `SENTRY_PROJECT` | EAS build profile | Source-map upload at build time. |
| `EAS_PROJECT_ID` | EAS | Set by `eas init`. |
| `APP_VARIANT` | eas.json | `development` \| `preview` \| `production`; picks the app name and bundle ID. |

## Layout

```
app/                  expo-router routes — one-line re-exports, no logic
src/
  features/           one folder per screen area; the actual components
  components/         shared RN primitives
  lib/                api client, query client, storage, Sentry
  theme/              palette + accent derivation
  testing/            the provider wrapper screen tests need
```

Routes stay one line for two reasons: `architecture.md` Section 6 puts screen
code under `src/`, and expo-router's `require.context` over `app/` would pull
any colocated `*.test.tsx` — and the testing library with it — into the
shipped bundle.

## Not yet built

`FEATURES` in `src/features.ts` gates the 1.1 surfaces (`meta`, character
`talents`) that `architecture.md` Section 8.10 defers. The Meta route and its
tab slot exist and are hidden, so 1.1 is a flag flip rather than a navigation
restructure.

## Not wired up yet

`expo-updates` is not installed. Section 7 wants OTA updates, but EAS Update
needs a project ID and a release process, which is Phase 10's job — the
`channel` fields already in `eas.json` are where it plugs in.

Zustand is not installed either: Section 7 scopes it to the `roster` context,
which does not exist until Phase 5.

## Outstanding manual steps

- `eas init` (needs an Expo account) to get `EAS_PROJECT_ID`.
- This machine's `JAVA_HOME` points at `jdk-17.0.16`, which is no longer
  installed (`jdk-17.0.20.8-hotspot` is). Gradle refuses to start until it is
  corrected or overridden per-command.
- Store-availability check on the name "Mythos" — `architecture.md` Section
  8.2's open action item. It appears in `app.config.ts` and nowhere else.
- Apple Developer Program and Google Play Console enrolment
  (`architecture.md` Section 8.1) — the long poles.
