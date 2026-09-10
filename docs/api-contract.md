# Mythos Mobile — API Contract (`/v1`)

Companion to `architecture.md`. This is the permanent contract — once a build
ships to a store, old installs call `/v1` for years, so it's additive-only
after the first release. Breaking changes get `/v2` alongside it, never a
mutation of `/v1`.

Status: implemented in Phase 3 (2026-09-07). The five v1 endpoints are live
in `apps/web/src/pages/api/v1/`, their schemas are in
`packages/api-contract`, and `packages/api-client` is the typed client over
them. The two `meta/*` endpoints below are still 1.1 — their schemas exist,
their routes do not.

**Corrections this document has absorbed from implementing it.** The prose
below is the design; where the implementation disagreed with it, the
implementation is right and the sections are updated in place. Three worth
calling out because they change what a client has to do:

1. **The refresh cooldown returns the standard error envelope**, not the
   bare `{ error: 'rate_limited', message, retryAfterSeconds }` object the
   original draft unioned into the success schema. Two incompatible error
   shapes depending on which route you called would have meant two client
   parsers. It's now `ApiErrorEnvelopeSchema` plus a `retryAfterSeconds`
   field (`RateLimitedEnvelopeSchema`), so one parser handles every failure.
2. **`GET /v1/bis/:season` has one response shape, not two.** With
   `class`+`spec` it returns the same object with `specs` filtered to that
   one entry, so a client has one parser and one cache-entry format either
   way. `version` is a content hash over the whole season in both modes,
   which keeps a client's ETag valid across them.
3. **Every POST to `/v1` must send `Content-Type: application/json`**, even
   with an empty body. Astro's CSRF protection (`security.checkOrigin`, on
   by default) rejects a form-shaped or content-type-less POST that has no
   matching `Origin` header, and a native client sends no `Origin`. Without
   the header, `POST .../refresh` answers 403 before the route runs. Found
   by smoke-testing the running server; `@mythos/api-client` sets it.

## Base

- Base URL: `https://<web-app-domain>/api/v1` — same Vercel project as
  `apps/web` (confirmed, `architecture.md` Section 8.4).
- **v1-launch scope:** per `architecture.md` Section 8.10, v1 ships
  Gear + Progression. `/v1/meta`, `/v1/realms`, `/v1/character/...`, its
  `/refresh`, and `/v1/bis/:season` are needed for launch. The two
  `meta/*` endpoints below are speced now but implemented in 1.1 — they're
  additive to an already-shipped `/v1`, so speccing them early costs
  nothing and avoids a second contract-design pass later.
- Every request/response shape is a Zod schema in `packages/api-contract`.
  The server parses its own outputs against them in tests (contract drift
  fails CI, not a shipped phone); the client parses every response at
  runtime before it touches app code.
- `X-Mythos-Client: mobile/<version> (ios|android)` header on every request —
  telemetry + version-gating hint only, never a security boundary.
- Rate limiting: every route calls the **existing**
  `rateLimit(key, limit, windowSeconds)` from `src/lib/http/rateLimit.ts`
  (cache-backed fixed window, Redis in prod / in-memory in zero-infra dev —
  no new dependency), keyed `v1:<route>:<ip>`. Suggested limits below per
  route, matching the order of magnitude already used on `/api/character`
  (20/60s) and `/api/character/refresh` (10/60s).
- CORS: no `Access-Control-Allow-Origin` header is sent, which is the
  restrictive default — a browser on another origin can issue the request
  but cannot read the response. Nothing was added to achieve this; it is
  called out so it is not mistaken for an oversight. Native clients aren't
  subject to CORS, so this costs mobile nothing.

## Error envelope

`toApiError()` in `src/lib/http/errorResponse.ts` already maps the five typed
errors (`CharacterNotFoundError`, `CharacterPrivateError`, `RealmNotFoundError`,
`BlizzardUnavailableError`, `BlizzardApiError`) to `{ error, message }`. `/v1`
extends — does not replace — that function with a `retryable` flag and nests
under an `error` key, so the existing `/api/*` routes (still used by the web
app) are untouched:

```ts
// packages/api-contract/src/error.ts
export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum([
      'character_not_found',
      'character_private',
      'realm_not_resolved',
      'blizzard_unavailable',
      'blizzard_error',
      'rate_limited',
      'invalid_region',
      'update_required',
      'unknown',
    ]),
    message: z.string(),
    retryable: z.boolean(),
  }),
});
```

`retryable: true` for `blizzard_unavailable`/`rate_limited`; `false` for
everything else, from a single `RETRYABLE_ERROR_CODES` table the server
stamps from and the client reads off the wire, so the two can't disagree.
`code` is what the client branches on for the per-error-code screens in
`mobile-ux.md`; `message` is human-facing and may change freely, so a client
must never match on it.

`@mythos/api-client` adds two codes of its own on top of these —
`'network'` (the request never reached the server) and `'invalid_response'`
(the body doesn't match this contract). Neither can appear in a server
payload, so they extend the client's error type rather than this enum; app
code catching a `MythosApiError` sees all eleven in one union.

## Endpoints

### `GET /v1/meta`

Server + season metadata, called on app launch. Rate limit: 60/60s per IP
(cheap, cacheable 1h client-side).

```ts
const MetaResponseSchema = z.object({
  season: z.object({
    id: z.string(),               // seasonConfig.CURRENT_SEASON_ID
    displayName: z.string(),
    raidName: z.string(),
  }),
  seededSpecs: z.array(z.object({ class: z.string(), spec: z.string(), armorType: z.enum(['cloth','leather','mail','plate']) })),
  minimumSupportedClientVersion: z.string(),  // semver
  notice: z.string().nullable(),              // e.g. "Blizzard's API is having an outage"
  seasonSlots: z.object({                     // optional — see below
    enchantableSlots: z.array(z.string()),
    embellishableSlots: z.array(z.string()),
  }).optional(),
});
```

If the running app's version < `minimumSupportedClientVersion`, show the
blocking update-required screen (Section "Update required" in
`mobile-ux.md`) before rendering anything else.

`seasonSlots` was added in Phase 7 and is the season's own slot rules:
which slots take an enchant, and which can carry a crafted embellishment.
`deriveActionGroups` needs both to produce the upgrade board's quick wins,
no Blizzard payload carries them, and `architecture.md` Section 5 forbids
compiling either list into the app, so they arrive here with the rest of
the season's reference data. It composes from `@mythos/core/bis`'s
`SeasonSlotsSchema` — the same type `deriveActionGroups` takes — rather
than restating the shape.

It is **optional**, deliberately. It was added after the client shipped a
build without it, and a required field would mean a client newer than the
deployed server fails to parse this whole response — losing the season line
and, far worse, the `minimumSupportedClientVersion` gate — in exchange for
a section of hints. Absent means "no enchant or embellishment hints", never
a hardcoded fallback; the socket hints are derived from the character's own
equipment and are unaffected.

### `GET /v1/realms?region=us&q=are`

Realm autocomplete. Wraps the existing `getRealmIndex`/`MOCK_REALMS` logic
from `src/pages/api/realms.ts` verbatim. Rate limit: 60/60s per IP (matches
today's `/api/realms`). Client persists results 30 days (matches server TTL)
— usable fully offline once fetched once per region.

```ts
const RealmsResponseSchema = z.object({
  realms: z.array(z.string()),
  mock: z.boolean(),
});
```

### `GET /v1/character/:region/:realm/:name`

**One round trip.** Composes exactly what
`src/pages/character/[region]/[realm]/[name].astro` already composes server-side
— `getFullCharacter` + `getBisList` + `getRecommendedBuild` + the meta tier
badge + `getCharacterTalents` (best-effort) + `getCharacterProgression`
(best-effort) — and returns it as one payload instead of rendering HTML.
Talents/progression failures don't fail the whole request (same "supplementary,
not core" rule the Astro page already applies) — they come back `null` with
the rest of the payload intact. Rate limit: 20/60s per IP (matches today's
`/api/character` + the character-page's own limiter).

`talents`/`recommendedTalents` stay in the response shape even though the
mobile Talents UI is deferred to 1.1 (`architecture.md` Section 8.10) —
they're already computed as part of this same server-side composition at no
extra Blizzard-call cost, and shipping the field now avoids a schema change
when the Talents tab lands. The v1 mobile client simply doesn't read it.

```ts
const CharacterResponseSchema = z.object({
  character: DomainCharacterSchema,
  equipment: EquipmentBySlotSchema,
  stats: SecondaryStatsSchema,
  avatarUrl: z.string().nullable(),
  mock: z.boolean(),
  fetchedAt: z.number(),
  stale: z.boolean(),
  bis: z.object({
    entries: z.array(BisEntrySchema),
    seeded: z.boolean(),
    statPriority: StatPrioritySchema.optional(),
  }),
  talents: CharacterTalentsSchema.nullable(),
  recommendedTalents: RecommendedTalentBuildSchema.nullable(),
  progression: z.object({
    raid: DomainRaidProgressSchema,
    mythicPlus: DomainMythicPlusProfileSchema,
  }).nullable(),
  metaTier: MetaTierSchema.nullable(),
});
```

### `POST /v1/character/:region/:realm/:name/refresh`

Cache-bypassing refetch, wrapping `refreshCharacter` from `client.ts`. Keeps
the existing 60s-per-character cooldown, which `refreshCharacter` enforces
itself — the route's own 10/60s IP limiter is a separate concern (it stops a
client hammering the endpoint across many characters) and the two are
deliberately not stacked into one. On cooldown the route returns `429` with
`retryAfterSeconds`; on success it returns `200` with the same payload as
`GET /v1/character/...`, since a client that just invalidated its cache
needs the new snapshot and shouldn't pay a second round trip for it.
Rate limit: 10/60s per IP on top of the per-character cooldown.

Every POST here must set `Content-Type: application/json` even though it has
no body — see the correction note at the top of this document.

```ts
// 200
const RefreshResponseSchema = CharacterResponseSchema;

// 429 — the standard envelope, plus how long to wait
const RateLimitedEnvelopeSchema = z.object({
  error: z.object({
    code: z.literal('rate_limited'),
    message: z.string(),
    retryable: z.literal(true),
  }),
  retryAfterSeconds: z.number(),
});
```
```

### `GET /v1/bis/:season?class=&spec=`

Full BiS seed data, wrapping the same Postgres-or-seed-JSON path
`getBisList` uses (`getBisSeason`), so `/v1` and the web app can't disagree
about what's seeded. Two modes, **one response shape**:
- No `class`/`spec` query params → every seeded spec's entries, for offline
  prefetch — this is what the original brief's "bulk prefetch" endpoint
  meant.
- With `class`+`spec` → the same object with `specs` filtered to that one
  spec (empty if it isn't seeded). Mainly for the prefetch/cache-warm case
  and a future "browse all specs" screen; the character screen already gets
  its own entries inline from `GET /v1/character/...`.

`version` is a short content hash over the season's specs, sorted by
class/spec so readdir and row order can't churn it. It's served as an
`ETag` in both modes and the route answers `304` to a matching
`If-None-Match`, so a client prefetching on every launch pays one
conditional GET rather than re-downloading unchanged seed data.
Rate limit: 60/60s.

```ts
const BisSeasonResponseSchema = z.object({
  season: z.string(),
  version: z.string(),   // sha256 of the sorted specs, truncated — served as the ETag
  specs: z.array(z.object({
    class: z.string(),
    spec: z.string(),
    armorType: z.enum(['cloth','leather','mail','plate']),
    statPriority: StatPrioritySchema,
    entries: z.array(BisEntrySchema),
  })),
});
```

### `GET /v1/meta/tier-list/:season?contentType=mythic-plus|raid` — 1.1

**New — not in the original brief. Deferred to 1.1** (`architecture.md`
Section 8.10) — specced now, implemented once the Meta tab is in scope.
Wraps `getMythicPlusTierList`/
`getRaidTierList`. Backs the mobile `/meta` tab, which per `mobile-ux.md` is
browsable without a character lookup. Rate limit: 60/60s.

```ts
const TierListResponseSchema = z.object({
  season: z.string(),
  contentType: z.enum(['mythic-plus', 'raid']),
  lastUpdated: z.string(),
  source: z.string(),
  seeded: z.boolean(),
  entries: z.array(MetaTierEntrySchema),  // { class, spec, role, tier, score? }
});
```

### `GET /v1/meta/spec-build/:class/:spec` — 1.1

**New — not in the original brief. Deferred to 1.1** alongside the tier-list
endpoint. Wraps what
`src/pages/meta/[class]/[spec].astro` already composes: `getSpecTalentTree`
(Blizzard's talent tree for the spec — no character required) +
`getRecommendedBuild` + `getRaidRecommendedBuild` + both tier badges. One
round trip for the mobile spec-build detail screen, same "don't split a
single screen into five calls" instinct as the character endpoint. Rate
limit: 30/60s (this one always hits Blizzard for the tree — no character
cache to lean on).

```ts
const SpecBuildResponseSchema = z.object({
  class: z.string(),
  spec: z.string(),
  tree: DomainTalentTreeSchema,
  mythicPlusBuild: RecommendedTalentBuildSchema.nullable(),
  raidBuild: RecommendedTalentBuildSchema.nullable(),
  mythicPlusTier: MetaTierSchema.nullable(),
  raidTier: MetaTierSchema.nullable(),
});
```

## Summary table

| Method | Path | Wraps | Rate limit | Character required? | Ships | Status |
|---|---|---|---|---|---|---|
| GET | `/v1/meta` | new composition | 60/60s | No | v1 | Live |
| GET | `/v1/realms` | `api/realms.ts` | 60/60s | No | v1 | Live |
| GET | `/v1/character/:region/:realm/:name` | the character Astro page's composition | 20/60s | Yes | v1 | Live |
| POST | `/v1/character/:region/:realm/:name/refresh` | `refreshCharacter` | 10/60s + per-char cooldown | Yes | v1 | Live |
| GET | `/v1/bis/:season` | `getBisSeason` | 60/60s | No | v1 | Live |
| GET | `/v1/meta/tier-list/:season` | `getMythicPlusTierList`/`getRaidTierList` | 60/60s | No | **1.1** | Schema only |
| GET | `/v1/meta/spec-build/:class/:spec` | the meta spec-build Astro page's composition | 30/60s | No | **1.1** | Schema only |

Seven endpoints, not five — the two `meta/*` additions exist because the
`meta` bounded context (Section 3 of `architecture.md`) is a real,
character-independent feature in the current codebase that the original
brief missed. Both are speced now but implemented in 1.1, per the v1-scope
decision in `architecture.md` Section 8.10 (v1 = Gear + Progression).
