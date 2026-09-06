# Mythos Mobile — API Contract (`/v1`)

Companion to `architecture.md`. This is the permanent contract — once a build
ships to a store, old installs call `/v1` for years, so it's additive-only
after the first release. Breaking changes get `/v2` alongside it, never a
mutation of `/v1`.

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
- CORS: browser origins restricted to the web app's own domain. Native
  clients aren't subject to CORS, so this costs mobile nothing.

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
everything else. `code` is what the client branches on for the per-error-code
screens in `mobile-ux.md`; `message` is human-facing and may change freely.

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
});
```

If the running app's version < `minimumSupportedClientVersion`, show the
blocking update-required screen (Section "Update required" in
`mobile-ux.md`) before rendering anything else.

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
the existing 60s-per-character cooldown (currently enforced by
`refreshCharacter` itself, not the route's own rate limiter — verify this at
implementation time and don't stack two independent cooldowns). Returns `429`
with `retryAfterSeconds` on cooldown, `200` with the same shape as
`GET /v1/character/...` on success. Rate limit: 10/60s per IP on top of the
per-character cooldown (matches today's `/api/character/refresh`).

```ts
const RefreshResponseSchema = z.union([
  CharacterResponseSchema,
  z.object({ error: z.literal('rate_limited'), message: z.string(), retryAfterSeconds: z.number() }),
]);
```

### `GET /v1/bis/:season?class=&spec=`

Full BiS seed data, wrapping `getBisList`. Two modes:
- No `class`/`spec` query params → the full season index (every seeded
  spec's entries), for offline prefetch — this is what the original brief's
  "bulk prefetch" endpoint meant. Include an `ETag`/`version` so the client
  can conditionally skip re-downloading.
- With `class`+`spec` → a single spec's entries, matching what the character
  screen actually needs (already included inline in
  `GET /v1/character/...`, so this shape mainly exists for the prefetch/cache-
  warm case and for a future "browse all specs" screen). Rate limit: 60/60s.

```ts
const BisSeasonResponseSchema = z.object({
  season: z.string(),
  version: z.string(),   // e.g. a content hash or ISO date of last edit — for ETag/cache-bust
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

| Method | Path | Wraps | Rate limit | Character required? | Ships |
|---|---|---|---|---|---|
| GET | `/v1/meta` | new composition | 60/60s | No | v1 |
| GET | `/v1/realms` | `api/realms.ts` | 60/60s | No | v1 |
| GET | `/v1/character/:region/:realm/:name` | the character Astro page's composition | 20/60s | Yes | v1 |
| POST | `/v1/character/:region/:realm/:name/refresh` | `refreshCharacter` | 10/60s + per-char cooldown | Yes | v1 |
| GET | `/v1/bis/:season` | `getBisList` | 60/60s | No | v1 |
| GET | `/v1/meta/tier-list/:season` | `getMythicPlusTierList`/`getRaidTierList` | 60/60s | No | **1.1** |
| GET | `/v1/meta/spec-build/:class/:spec` | the meta spec-build Astro page's composition | 30/60s | No | **1.1** |

Seven endpoints, not five — the two `meta/*` additions exist because the
`meta` bounded context (Section 3 of `architecture.md`) is a real,
character-independent feature in the current codebase that the original
brief missed. Both are speced now but implemented in 1.1, per the v1-scope
decision in `architecture.md` Section 8.10 (v1 = Gear + Progression).
