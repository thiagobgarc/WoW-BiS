# Mythos Mobile — Architecture

Status: Phase 5 complete (2026-09-07) — the monorepo move, `packages/core`,
`packages/api-contract`, `packages/api-client`, the `/api/v1` routes, the
`apps/mobile` Expo scaffold and the search + roster screens described below
are implemented, not just planned; see the git history for the exact commits. Verified against the `worldofwarcraft` repo as of
2026-09-03 (Astro 7.2, React 19.2, Zod 4.4, `astro check`/`tsc` clean on
that date) and re-verified against each phase's actual implementation.

**Scope note — what has and hasn't moved.** Section 1's table describes the
full target end state. Phase 2 moved `bis/` (types, `compareGear`,
`deriveActionGroups`), `talents/` (types, `diffTalents`), `realm/`
(`realmSlug`), `utils/` (`classColors`, `itemQuality`, `format`,
`sourceLabel`), and the minimal `character` types those pure functions
needed. Phase 3 moved the rest of what crosses the API boundary:
`meta/types.ts`, the talent-tree structural types (`DomainTalentTree` and
friends) and a new `progression/` module (`DomainRaidProgress`,
`DomainMythicPlusProfile`, `RAID_DIFFICULTIES`). All of it is type-only —
the mappers that produce these shapes from Blizzard's raw responses stay in
`apps/web`, and `domain.ts` re-exports everything so no call site changed.

Phase 3 also converted these shapes to Zod-first (schema + `z.infer`)
rather than hand-written interfaces. They *are* the `/v1` payload shapes, so
`packages/api-contract` composes its response schemas from them instead of
maintaining a parallel copy that could silently drift.

Two things this note previously listed as Phase 3 work are deliberately
**not** done, because implementing Phase 3 showed neither has a consumer:

- **The season config type.** `/v1/meta` exposes three scalar season fields
  (`id`, `displayName`, `raidName`), not the config object, and
  `deriveActionGroups` already takes the narrow `SeasonSlots` interface
  `packages/core` defines itself. Moving the full `SeasonConfig` type would
  put season structure into core with nothing importing it.
- **`packages/data`.** The seed JSON stays at `apps/web/data`. `/v1/bis` and
  `/v1/meta` serve it over HTTP from `apps/web`, which reads it in-process;
  no other package needs the files, and mobile is forbidden from bundling
  season data at all (Section 5). Promoting it to a package would mean
  reworking the `process.cwd()`-relative loaders for no consumer.

Revisit either if something actually needs them.

## 0. Corrections to the brief

The build prompt this document is based on was accurate about the repo's shape
in most respects, but out of date in three ways worth stating up front, because
they change the API surface and the bounded-context list below:

1. **`meta` is a real, independent feature**, not covered anywhere in the
   original prompt. `src/pages/meta.astro` and
   `src/pages/meta/[class]/[spec].astro` serve a tier list (`data/meta/{season}/{mythic-plus,raid}-tier-list.json`, schema in `src/lib/meta/types.ts`) and a per-spec
   "recommended build" page that composes `getSpecTalentTree` (Blizzard's spec
   talent tree, keyed by spec id — no character required) with
   `getRecommendedBuild`/`getRaidRecommendedBuild` and the tier badge. This is
   browsable with **no character lookup at all** — it's the "what's good right
   now" surface, structurally independent of the `character` context.
2. **`progression` (raid + Mythic+ tabs) is a real, separate composition**,
   not part of `getFullCharacter`. `getCharacterProgression.ts` calls three
   more Blizzard endpoints (raid encounters, M+ profile index, M+ season
   detail) and is composed into the character page alongside gear/BiS/talents.
   It has its own domain types (`DomainRaidProgress`,
   `DomainMythicPlusProfile`) and its own components
   (`RaidProgressionPanel`, `MythicPlusPanel`). The mobile character screen
   and the `/v1/character/...` payload both need to account for it.
3. **A rate limiter and an error envelope already exist** —
   `src/lib/http/rateLimit.ts` (cache-backed fixed window, already used on
   `/api/character`, `/api/character/refresh`, `/api/realms`, and the
   character page itself) and `src/lib/http/errorResponse.ts`
   (`toApiError()`, mapping the five typed Blizzard/domain errors to
   `{ error, message }`). The mobile API reuses both rather than adding
   `@upstash/ratelimit` as a new dependency or hand-rolling a new envelope —
   `toApiError` is extended (Section titled "Error envelope" in
   `api-contract.md`), not replaced.

Everything else in the original brief — the layering stance, the DDD
rejection of event sourcing/CQRS, the pure-domain module list, the "one round
trip" API instinct — held up against the code and is carried forward below.

## 1. What's actually shared vs. server-only (verified)

| Module | Shared verbatim into `packages/core`? | Notes |
|---|---|---|
| `src/lib/bis/compareGear.ts`, `deriveActionGroups.ts`, `types.ts` | Yes | Zero I/O, confirmed no imports outside `@/lib/blizzard/domain` (types only) and `./types`. |
| `src/lib/talents/diffTalents.ts`, `types.ts` | Yes | Pure. `getRecommendedBuild.ts`/`loadRecommended.ts` are **not** pure (`fs` reads via `loadSeedFile`-style loaders) — those stay server-side; only the Zod schemas in `types.ts` move. |
| `src/lib/blizzard/domain.ts` | **Types only** — mappers stay server-side | Corrected from an earlier draft of this document, which said the mapper functions (`mapProfile`, `mapEquipment`, `mapStatistics`, `mapTalentTree`, `mapTalentSelections`, `mapRaidProgress`, `mapMythicPlusProfile`) would move too. They can't: every one of them takes an already-parsed Blizzard shape (`schemas.ts` types) as input, and `schemas.ts` is large, Blizzard-specific, and explicitly server-only per this same table. Only the *output* types move — `EquipmentSlot`, `DomainItem`, `EquipmentBySlot`, `TalentSelection`, `DomainCharacter`, `SecondaryStats` in Phase 2, then `DomainTalentTree`/`DomainRaidProgress`/`DomainMythicPlusProfile` and friends in Phase 3 (into `core/talents` and the new `core/progression`). `domain.ts` re-exports all of them, so its existing consumers are unaffected, and it keeps the mappers. Mobile never sees a raw Blizzard shape; it only ever sees these already-mapped types, which is what the `/v1` API returns. This is what the original build prompt said before Phase 1 introduced the error. |
| `src/lib/season/seasonConfig.ts` | **Values via `/v1/meta`; the type stays in `apps/web`** | See Section 5's "no hardcoded season" rule — the mobile app fetches season data from `/v1/meta` / `/v1/bis/:season`, never from a compiled-in copy. An earlier draft also had the *type* moving so `packages/core` could type against it; Phase 3 found nothing that needs it (`deriveActionGroups` defines its own narrow `SeasonSlots`, and `/v1/meta` exposes three scalar fields, not the config object), so it stays put. See Section 0. |
| `src/lib/realmSlug.ts` | Yes | 19 unit tests move with it. |
| `src/lib/meta/types.ts` (`MetaTierListSchema` etc.) | Yes (Phase 3) | Pure Zod schema, same pattern as `bis/types.ts`. `MetaTierSchema` is part of the `/v1/character/...` response, which is what finally pulled it across; `apps/web` keeps a re-export shim at `@/lib/meta/types` so its nine consumers were untouched. |
| `src/lib/utils/classColors.ts`, `itemQuality.ts`, `format.ts` (`timeAgo`), `sourceLabel.ts` | Yes | Pure formatters/lookup tables the original brief already called out. |
| `src/lib/blizzard/client.ts`, `auth.ts`, `schemas.ts`, `getFullCharacter.ts`, `getCharacterTalents.ts`, `getCharacterProgression.ts`, `getSpecTalentTree.ts`, `mock.ts`, `mockRealms.ts` | **No — server only** | OAuth, raw Blizzard schemas, and every "compose Blizzard calls" function stay in `apps/web`. These become the implementation behind `/v1` routes, not code mobile imports. |
| `src/lib/cache/cache.ts`, `src/lib/db/*`, `src/lib/http/rateLimit.ts`, `errorResponse.ts` | **No — server only** | Mobile gets its own device-side persistence (Section 6.3); the rate limiter and error mapper are server infrastructure the `/v1` routes call into, same as today's `/api/*` routes do. |
| `src/lib/bis/getBisList.ts`, `src/lib/talents/getRecommendedBuild.ts`, `src/lib/meta/getTierList.ts`, `loadTierList.ts`, `specBySlug.ts` | **No — server only** | Each does `fs`/DB reads. They become the implementation behind `/v1/bis`, `/v1/talents`, `/v1/meta/*`. |

## 2. Layering

```
Presentation   (apps/mobile: screens, RN components — no business logic)
      ↓ depends on
Application    (apps/mobile: src/features/<context>/model — view-model
                derivation, composes packages/core functions into screen data;
                src/features/<context>/api — TanStack Query hooks over
                @mythos/api-client)
      ↓ depends on
Domain         (packages/core: compareGear, deriveActionGroups, diffTalents,
                domain types, seasonConfig shape, realmSlug, formatters —
                zero I/O, zero React, zero fetch)
      ↑ implemented by
Infrastructure (apps/mobile/src/lib: MMKV persistence, TanStack Query
                persister, deep-link handling, Sentry init, the concrete
                fetch used by @mythos/api-client; apps/web/src/lib: the
                existing Blizzard client/cache/db, now also backing /v1)
```

Dependency direction is inward: Presentation → Application → Domain never
reverses, and Infrastructure depends on Domain-defined interfaces (e.g.
`api-client` is typed against `api-contract` schemas, not the other way
round). This isn't a new pattern for this codebase — `compareGear`/
`deriveActionGroups`/`diffTalents` already are the domain layer, they're
just not packaged as one yet. Phase 2 packages what already exists; it does
not invent a new architecture for the domain logic.

## 3. Bounded contexts (DDD, lightly)

Eight contexts, expanded from the brief's six to reflect what the code
actually does (additions bolded):

| Context | Owns | Write model? |
|---|---|---|
| `character` | Identity + equipped-gear snapshot (`DomainCharacter`, `EquipmentBySlot`, `SecondaryStats`) | No — read-only projection of Blizzard state |
| `bis` | BiS targets, `compareGear` output, severity | No |
| `talents` | Talent tree structure, a character's current build, the diff against a recommended build | No |
| **`progression`** | Raid difficulty/boss-kill state and Mythic+ best-run state for the current season | No |
| **`meta`** | The hand-authored tier list and per-spec recommended builds, independent of any character | No |
| `season` | `seasonConfig` — the single source of season-scoped reference data | No (config, not user data) |
| `roster` | The user's own recent/saved characters | **Yes — the only context with a real write model**, and it's entirely device-local (Section 4's "no user accounts" call) |
| `catalog` | Realm index, item media/icon URLs | No |

`progression` and `meta` are split out from `character` because they compose
from genuinely different Blizzard endpoints, have their own domain types, and
— for `meta` specifically — don't require a character at all. Keeping them
distinct keeps the `/v1` endpoint table honest about what each request
actually needs to fetch.

## 4. Rejected alternatives (explicit, not omissions)

- **Event sourcing — rejected.** Equipped gear, raid progress, and M+ rating
  are Blizzard's state, not ours; every screen is a pure derivation from a
  timestamped snapshot (`FullCharacter.fetchedAt`/`.stale`,
  `CharacterProgression`). There is no user-authored history to source events
  from. An event store here has no consumer — it would be ceremony.
- **CQRS as a formal pattern — rejected, keep the instinct.** One real write
  model (`roster`, device-local) and everything else is a read projection.
  Splitting reads/writes into separate models for a single local writer is a
  diagram, not an architecture.
- **User accounts / server-side auth — rejected.** Nothing in the product
  needs cross-device identity. Recent/favorite characters are device-local
  (Zustand + MMKV, not a server write). This keeps the App Store privacy
  declaration close to "no data collected" and removes an entire class of
  work (auth flows, token storage, account recovery, GDPR data-export
  requests). Revisit only if cross-device roster sync becomes an explicit,
  requested feature — and if it does, it's additive (a sync endpoint under
  `roster`), not a rearchitecture.
- **Certificate pinning — rejected.** No user credentials and no auth token
  ever touch the device; the only thing pinning would protect is a
  read-only public API response. Not worth the operational cost of managing
  pin rotation for this threat model. Stated explicitly so it isn't mistaken
  for an oversight.

## 5. What replaces them: snapshot + cache-invalidation

`FullCharacter` (and, by the same pattern, `CharacterProgression` and the
tier-list/recommended-build responses) is an immutable, timestamped snapshot.
The server already keeps a 7-day stale copy and returns `stale: true` when
Blizzard is down (`getFullCharacter.ts`). On device this extends by one hop:

- Every `/v1` response is persisted (TanStack Query + MMKV persister), keyed
  by request (character key, season, class/spec).
- The UI always renders the last snapshot instantly, revalidating behind it —
  never a blocking spinner over data already on disk.
- An explicit "last updated X ago" / "offline" banner is a first-class UI
  state, not an edge case, mirroring the server's own `stale` flag.

This is the defensible "what did we know, and when" answer the reference
document gets from event sourcing — achieved here with a cache-invalidation
model appropriate to a domain with no real event history.

**No hardcoded season data in the mobile binary.** `seasonConfig`'s *shape*
is shared as a type (so `packages/core`'s consumers can be typed against it),
but its *values* are never compiled into the app. The mobile app always reads
season data from `/v1/meta` and `/v1/bis/:season` at runtime, with the last
successfully fetched copy persisted as the offline fallback — never the copy
from whatever `seasonConfig.ts` looked like when the binary was built. A
season roll must not require an app-store release; see Section 11.5 of the
original brief, which this document affirms without change.

## 6. Target repository shape

As of Phase 3, the repo root is still named `worldofwarcraft` on disk (not
renamed to `mythos/`) — the rename is a cosmetic, fully-reversible local
folder rename with no functional dependency, deliberately deferred so it
doesn't get tangled with the Vercel root-directory setting change the move
already requires. `apps/mobile` exists as of Phase 4, with the layout below
plus two additions the scaffold needed: `src/testing/` (the provider wrapper
screen tests need) and `src/features.ts` (the 1.1 feature flags).
`packages/core`, `packages/api-contract` and `packages/api-client` all exist;
`packages/data` does not, and `data/` stays at `apps/web/data` — see the
scope note in Section 0 for why.

One rule the scaffold added: **files under `app/` are one-line re-exports of
a screen in `src/features/`**, never the screen itself. expo-router builds a
`require.context` over `app/`, so a test file colocated with a route pulls
the testing library into the shipped bundle — which is how this was found.

```
mythos/
├── apps/
│   ├── web/                       # existing Astro app, moved wholesale
│   └── mobile/                    # NEW — Expo app
│       ├── app/                   # expo-router routes, no logic
│       └── src/
│           ├── features/          # one folder per bounded context (8, see Section 3)
│           ├── components/        # RN design-system primitives
│           ├── lib/                # MMKV, Query persister, deep links, Sentry
│           └── theme/
├── packages/
│   ├── core/                      # pure domain — see Section 1's table for exactly what moves
│   ├── api-contract/              # Zod schemas for every /v1 request+response
│   ├── api-client/                # typed fetch client over api-contract; DI'd fetch + baseUrl
│   └── data/                      # data/bis/**, data/talents/**, data/meta/** seed JSON
└── docs/
    ├── architecture.md            # this file
    ├── api-contract.md
    ├── mobile-ux.md
    └── release.md                 # produced in Phase 10
```

**Dependency rules, enforced not merely stated:**

- `packages/core` imports nothing but `zod`.
- `packages/api-contract` imports `zod` + `core` only. It composes its
  response schemas from `core`'s schemas rather than restating the shapes,
  so a domain type change is a compile error in the contract rather than a
  runtime surprise on a phone.
- `packages/api-client` imports `core` + `api-contract` only; takes `fetch`
  and `baseUrl` by injection.
- `apps/*` may import `packages/*`; `packages/*` never imports `apps/*`.
- Everything in Section 1's "server only" row stays in `apps/web` — none of
  it is a candidate for `packages/core`, because anything there is a
  candidate for bundling into a device binary, and `client.ts`/`auth.ts`
  process Blizzard credentials.

Enforced today by a plain Vitest test per package (`src/__tests__/boundaries.test.ts`
in `core`, `api-contract` and `api-client`) that scans every import/export
statement and fails on anything outside that package's allowlist. This is
deliberately not `eslint-plugin-import` + `import/no-restricted-paths` as an
earlier draft of this document proposed: these three allowlists are the only
boundaries the repo currently needs enforced, the check is the same `bun run
test` everything else already runs, and it costs no new dependency or lint
config. Swap in a fuller import-lint setup if `apps/mobile` turns out to need
per-feature rules of its own.

The one rule the tests can't see is the last bullet, since it's about what
*didn't* move; it's enforced by the first three, which fail the moment a
package reaches for `node:*`, `react`, `expo-*`, or an `@/` path.

## 7. Mobile stack

| Concern | Choice | Why |
|---|---|---|
| Runtime | Expo (managed) | EAS Build/Submit + `expo-updates` OTA is the shortest credible path to both stores solo. Resolve the current stable SDK/RN/React versions at install time (`npx create-expo-app@latest`, then `npx expo install` per package) — do not pin from memory; record the resolved versions in `apps/mobile/README.md`. |
| Routing | Expo Router | File-based, deep links + universal links for the web app's shareable character URLs and OG images for free. |
| Server state | TanStack Query + MMKV persister | Matches the stale-while-revalidate/offline semantics `getFullCharacter`'s `stale` flag already models server-side. |
| Local state | `useState`, plus a small Zustand store for `roster` only | No global store before there's global state — `roster` is the one context with real client state. |
| Styling | NativeWind (confirmed, Section 8.7) | Ports the web's Tailwind tokens (class colors, severity colors, spacing) as values instead of re-eyeballing. |
| Lists | FlashList | Long comparison/action-panel/tier-list rows. |
| Images | expo-image | Blizzard media URLs (item icons, avatars, talent/spell icons) — cache aggressively; icons are immutable per id. |
| Validation | Zod (same major version as `api-contract`, currently v4) | Same boundary discipline the web app already applies to Blizzard's responses, applied to the mobile API. |
| Storage | MMKV | Synchronous, fast, the standard Query-persister pairing. |
| Rate limiting / error mapping (server side) | **Reuse `src/lib/http/rateLimit.ts` and `errorResponse.ts`** | Already exist, already used on every current `/api/*` route. No new dependency. |
| Errors (client) | Sentry (`@sentry/react-native`) | A device console isn't readable after ship; without it a store release is unobservable. Declare it in the iOS privacy manifest. |
| Tests | Vitest (`packages/*`, unchanged runner), jest-expo + RNTL (`apps/mobile` units), Maestro (`apps/mobile` E2E) | Vitest can't run Metro/Hermes; jest-expo is the supported RN path. Maestro over Detox for setup cost. |

## 8. Decisions (recorded 2026-09-03)

All ten open questions from the original brief's Section 12 have been put to
the repo owner and answered. These are now settled inputs to Phase 2 onward,
not open questions:

1. **Developer accounts — neither exists yet.** Start Apple Developer
   Program and Google Play Console enrollment now, in parallel with Phase
   2/3 engineering — Apple's identity verification and Google's new-account
   closed-testing requirement are the long poles in the schedule and must
   not be discovered at Phase 10. **Action item, not blocking Phase 2.**
2. **Bundle ID / app name — `com.thiagobuenogarcia.mythos`, "Mythos."**
   Accepted as recommended, pending a store-availability check for the name
   "Mythos" (do this before Phase 4 scaffolding locks it into `app.config.ts`
   and before it appears in any store listing).
3. **Monorepo move — yes, full move.** `worldofwarcraft` becomes
   `mythos/apps/web`; done as Phase 2's own unit of work with the existing
   web Vitest + Playwright suite as the exit proof, plus a Vercel
   root-directory setting fix for the existing deployment.
4. **API hosting — same Vercel project as web, `/v1` namespace.** No
   separate deployment; `/v1` routes live alongside the existing `/api/*`
   routes in `apps/web`.
5. **Postgres — stays optional, zero-infra by default.** `/v1/bis` and
   `/v1/meta/tier-list` (see item 10 on `meta`'s v1 status) serve from disk
   via the existing `getBisList`/`loadTierList` fallback, exactly as today.
   No production Postgres dependency introduced for mobile.
6. **Branch workflow — shared, no mobile-specific branch.** `apps/mobile`
   follows the existing `development` → `main` flow once the monorepo move
   lands; one branch, one PR flow for both apps.
7. **Styling — NativeWind.** Confirmed as the mobile styling approach.
8. **Crash reporting — Sentry only, no product analytics.** Confirmed;
   declare it in the iOS privacy manifest as crash-diagnostics collection,
   nothing else.
9. **Theme — dark-only for v1.** No light-mode work in v1; the theme token
   structure should still be shaped so light mode is additive later, not a
   rearchitecture, but no light palette is authored or QA'd for v1.
10. **v1 scope — Gear + Progression.** Search, paper doll, upgrade board,
    **and** the raid/Mythic+ progression tabs ship in the first release.
    **`meta` (tier list + spec build) and `talents` (diff-first list, let
    alone the pannable tree) are both deferred to 1.1+** — this changes the
    Section 3 bounded-context list's *shipping* status (the contexts still
    exist in the domain model; `meta` and `talents` just have no mobile UI
    or `/v1` traffic until 1.1) and is reflected in `mobile-ux.md`'s
    navigation shape and `api-contract.md`'s v1/1.1 labeling per endpoint.

## 9. What Phase 4 settled

Section 7 chose the stack; scaffolding it forced decisions Section 7 could
not have made in the abstract. Resolved versions live in
`apps/mobile/README.md`, per Section 7's own instruction. The decisions:

1. **Zustand was not installed.** Section 7 lists it "for `roster` only".
   There is no roster yet, and the rule in that same row is "no global store
   before there's global state". It arrives with Phase 5, not before.
   *(Superseded by Phase 5, which installed it — see Section 10.1.)*
2. **NativeWind 4 + Tailwind v3 on mobile, Tailwind v4 on web.** NativeWind 4
   peer-depends on Tailwind v3 through `react-native-css-interop`; NativeWind
   5, which targets v4, was still preview. The apps share no stylesheet —
   only the token values in `apps/mobile/src/theme/palette.json`, which a
   test diffs against the web's `global.css` on every run, so "ported as
   values" (Section 7) stays true rather than becoming "roughly the same".
3. **The accent is a runtime CSS variable, not a compile-time token.** The
   web re-themes per character by setting `--accent` inline in
   `Layout.astro`. NativeWind's `vars()` is the same mechanism, so
   `accentVars(className)` is spread onto a wrapping View and every
   `accent-*` class below it resolves. `--accent-hover/-soft/-softer` are
   derived from the class color rather than listed, since there is one pair
   of literals on the web but thirteen class colors here.
4. **The 1.1 Meta slot exists and is hidden.** `mobile-ux.md` left the *how*
   to this phase. The route file and its tab entry both exist; the tab's
   `href` is `null` while `FEATURES.meta` is false. 1.1 is a flag flip plus
   the screen's content, never a navigation restructure — which is the change
   that would ripple into deep links.
5. **Bun's linker is `hoisted`** (`bunfig.toml`). Babel resolves presets and
   plugins by name from the config file's directory; Bun's default isolated
   layout hides them under `node_modules/.bun/<hash>/`, and both Metro and
   jest-expo fail with "Cannot find module '@babel/plugin-transform-react-jsx'"
   for a package that is installed. This is a repo-wide setting that exists
   for `apps/mobile`; `apps/web` is indifferent to it.
6. **React is pinned to one exact version repo-wide (19.2.3, Expo's).**
   `apps/web` floated on `^19.2.8`, which put a second copy of React in the
   tree that `expo-doctor` correctly flags: two Reacts is the "Invalid hook
   call" failure mode, and the tree is what EAS builds from. Web now takes
   React patches on the Expo SDK's cadence.
7. **`packages/*` typecheck under `noUncheckedIndexedAccess`.** The mobile
   app turned it on and immediately surfaced three unguarded array accesses
   in `api-client`'s version comparison — a function whose job is deciding
   whether to lock a user out of the app. The flag is now on in all three
   packages so that class of bug fails in the package, not in the consumer.
8. **Routes under `app/` are one-line re-exports.** See Section 6.

Two exit criteria from the phase plan could not be met on this machine and
are not blocked on code: an **iOS simulator** needs macOS, and a **dev EAS
build on a real device** needs an Expo account (`eas init`) plus the
developer-program enrolments in 8.1. What was verified instead: Metro
bundles both platforms (`expo export --platform ios --platform android`),
`expo-doctor` passes 21/21, and the app builds, installs and runs on an
Android emulator.

## 10. What Phase 5 settled

Search and the `roster` context. The phase's exit criterion — "searchable and
navigable in mock mode with no server" — is the reason most of these went the
way they did: on this screen the offline path is the design, not a fallback.

1. **Zustand is installed, and only the `roster` context uses it.** Section
   9.1 held it back until there was global state; there is now. The store
   holds two slices, both genuinely cross-screen: the recent list (written on
   the character screen, read on search) and the last-used region (has to
   outlive the search screen's unmount when a character is pushed). Nothing
   else in the app has a store, and server state stays in TanStack Query.
2. **The roster persists to MMKV, not to the query cache**, keeping
   `storage.ts`'s existing split by lifetime: the query cache is disposable
   and expires after a day, the roster is the only thing in the app a person
   would miss and never expires. Zustand's `persist` rehydrates
   *synchronously* because MMKV is synchronous, so the first frame of the
   search screen already has the recents — an async store would flash empty.
3. **Anything restored from disk is parsed, not trusted.** A persisted
   roster is restored before any schema check would otherwise run and can
   outlive the build that wrote it by years, so it goes through the same Zod
   parse a network response would. Malformed entries are dropped one at a
   time rather than failing the list — losing one row is recoverable, losing
   the roster is not.
4. **The roster is written when a character *resolves*, not when the form is
   submitted.** The web adds to its list inside the search form; that would
   miss every character reached by deep link (which is the whole point of the
   universal-link work in Section 9.4), and it would store whatever the user
   typed. Writing on the character screen instead means deep links count and
   the stored name is Blizzard's own spelling — which also makes dedup
   reliable, since two spellings converge on one entry. A failed lookup
   records nothing, so the list cannot fill with typos.
5. **Two deliberate deviations from the web's `RecentCharacter`**, which
   `mobile-ux.md` says to keep as-is:
   - Dedup is **case-insensitive on the name**. WoW names are unique per
     realm case-insensitively, so `Arthas` and `arthas` are one character;
     the web's `===` comparison would keep both. That is a latent bug there,
     not a rule worth porting.
   - The stored shape gains an optional **`className`**. The web has no use
     for it; this app re-themes per character from the class color already,
     so carrying it lets a recent row wear its own class color at no cost.
     Nullable, because entries written by an older build won't have it.
6. **The region picker offers four of the contract's five regions.** `cn` is
   valid in `RegionSchema` because the schema describes what the *API*
   accepts, but Blizzard serves mainland China from a separate API host with
   separate credentials that `apps/web` has never been configured for.
   Offering it would produce a lookup that cannot succeed. The contract stays
   permissive; the picker stays honest.
7. **Autocomplete never gates the search button.** Requiring the typed realm
   to match a suggestion would make the screen unusable exactly when the
   network is down. A realm that doesn't exist fails at the character screen,
   where every other lookup failure already surfaces. Both autocomplete
   failure states — offline, and the server serving sample realms — render as
   one line of hint text, never as an error screen.
8. **Offline realm autocomplete is partial, and the endpoint is why.** Any
   prefix fetched before is answered from the persisted query cache with no
   network. A prefix never typed on this device is not, because
   `/v1/realms` caps a response at 20 matches — there is no way to pull a
   region's whole realm list down in one request, so there is no full offline
   index to build from. `apps/web/src/pages/api/v1/realms.ts` claims a mobile
   client can persist the index "for the same 30 days"; that is only true
   per-prefix. Fixing it properly means an additive endpoint (a full-index
   mode, or an `If-None-Match`-style conditional like `/v1/bis` already has)
   and belongs in a later phase, not a retrofit here.
9. **A `staleTime` over ~24 days silently means "refetch immediately".**
   The realm query was first written with a 30-day `staleTime` to mirror the
   server's cache. TanStack schedules the stale transition with `setTimeout`,
   and Node and Hermes both clamp a delay past 2^31-1 ms to 1ms and fire it
   at once — so the longest-lived cache in the app was refetching on the next
   tick. It is `Infinity` now, which query-core's `isValidTimeout` excludes
   from scheduling altogether. Any *finite* duration handed to Query in this
   codebase has to stay under ~24 days; `gcTime`'s one day already is.
10. **Long lists get FlashList; short bounded ones don't.** Realm suggestions
    cap at 20 and the roster at 8, and both render inside the search screen's
    ScrollView, where a FlashList would nest two virtualised lists — the
    arrangement RN warns about — to save nothing. Section 7's FlashList row
    is about the comparison/action/tier-list rows, which are unbounded.
11. **Settings clears the roster through the store, not through MMKV.**
    Wiping the key underneath a live Zustand store leaves the list in memory,
    and the next visit persists it straight back. The store owns its key.

Verified: `bun run typecheck` and all 72 `apps/mobile` tests pass, the three
`packages/*` suites still pass (65 tests), and `expo export` bundles both
platforms. Not verified on device this phase — the Android emulator run from
Phase 4 was not repeated, so "runs on a phone" rests on the bundle building
and the unit tests, not on a launch.
