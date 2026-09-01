# Mythos — WoW Best-in-Slot Gear Planner

Look up a character (name + realm + region), pull their live equipped gear from the
Blizzard API, compare it slot-by-slot against a seeded Best-in-Slot list for their
class/spec, and get a paper-doll + upgrade board telling you exactly what to
replace, where it drops, and how close you are to fully BiS.

Stack: **Astro (TypeScript, strict) + React islands**, Tailwind CSS, Drizzle ORM
(Postgres), Redis-compatible caching (Upstash) with an in-memory fallback, Zod for
boundary validation, Vitest + Playwright, deployed to Vercel.

Astro (not Next.js) was chosen so most of the page ships as static/server-rendered
HTML with React only where there's real interactivity (search, paper doll,
upgrade board) — those interactive surfaces are still fully React under the hood.

---

## Quick start

```sh
bun install
bun run dev
```

Open http://localhost:4321. **No environment variables are required to run it** —
with `BLIZZARD_CLIENT_ID`/`BLIZZARD_CLIENT_SECRET` unset, every Blizzard-facing
call returns realistic mock data (see [Mocked behavior](#mocked-behavior) below),
and the BiS data layer reads straight from the seed JSON files instead of
Postgres. This means the entire product — search, paper doll, upgrade board,
error states — is clickable and testable with zero infra.

To connect real data:

```sh
cp .env.example .env
# fill in BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET at
# https://develop.battle.net/access/clients
```

Optional for production-grade caching and the BiS data layer:

```
UPSTASH_REDIS_REST_URL=...      # Upstash Redis REST API — omit for an in-memory cache
UPSTASH_REDIS_REST_TOKEN=...
DATABASE_URL=postgres://...     # Neon/Supabase-compatible — omit to read BiS data from JSON directly
```

---

## Commands

| Command              | Action                                                          |
| :-------------------- | :--------------------------------------------------------------- |
| `bun run dev`          | Start the dev server at `localhost:4321`                        |
| `bun run build`        | Production build to `./dist/`                                    |
| `bun run preview`      | Preview the production build locally                             |
| `bun run test`         | Run the Vitest unit suite                                         |
| `bun run test:watch`   | Vitest in watch mode                                               |
| `bun run test:e2e`     | Run the Playwright happy-path test (spins up the dev server)      |
| `bun run typecheck`    | `astro check` + `tsc --noEmit`                                    |
| `bun run db:generate`  | Generate a Drizzle migration from `src/lib/db/schema.ts`          |
| `bun run db:migrate`   | Apply migrations to `DATABASE_URL`                                |
| `bun run db:seed`      | Load `/data/bis/**` into Postgres (requires `DATABASE_URL`)       |

---

## Project structure

```
src/
  components/
    ui/              shadcn-style primitives (Button, Input, Tabs, Tooltip, Skeleton) — Radix + Tailwind, no shadcn CLI dependency
    search/           Search form, realm autocomplete, recent-chips (localStorage)
    character/        Paper doll, slot tiles, header, stats panel, refresh button
    upgrade-board/     Completion meter, comparison rows, severity chips, actionable panels, quick wins
    error/             Shared error-state presentation
  layouts/Layout.astro  Page shell: fonts, footer disclaimer, skip link, class-color accent var
  pages/
    index.astro                              Search page
    character/[region]/[realm]/[name].astro  Character page (SSR, OG-tagged)
    og/[region]/[realm]/[name].png.ts        Dynamic OG image (@vercel/og)
    api/character.ts                         GET character JSON (curl-able)
    api/character/refresh.ts                 POST — bypass cache, 60s cooldown per character
    api/realms.ts                            Realm autocomplete data source
  lib/
    blizzard/    OAuth token service, typed client per endpoint, Zod schemas, domain mapping, mock fixtures
    bis/         BiS types, pure compareGear() engine, action-group derivation, seed-file loader
    db/          Drizzle schema + client
    cache/       Redis/in-memory cache abstraction
    season/      seasonConfig.ts — the one file to edit each season
    utils/, hooks/, http/
data/bis/{season}/{class}-{spec}.json   Versioned BiS seed data (see below)
e2e/            Playwright happy-path test
```

---

## Everything Blizzard-facing is server-side

No Blizzard API call is ever made from the browser. `src/lib/blizzard/*` runs only
in Astro server code (API routes and `.astro` frontmatter); `BLIZZARD_CLIENT_ID`/
`SECRET` never reach the client bundle. Every response is parsed through a Zod
schema (`src/lib/blizzard/schemas.ts`) before anything touches app code — an
unexpected shape from Blizzard produces a typed `BlizzardApiError`, not a white
screen.

**Caching**: character profile/equipment/media/statistics are cached 5 minutes,
keyed `character:<kind>:<region>:<realm>:<name>` (see `client.ts`). Static item
data caches 7 days, the realm index 30 days. The "Refresh" button on a character
page bypasses the character cache but is itself rate-limited to once per 60s per
character. The OAuth token is cached with `TTL = expires_in - 60s` and refreshed
behind an in-process promise dedup **and** a best-effort Redis lock, so a burst of
concurrent requests doesn't stampede the token endpoint.

**Realm slugs**: `src/lib/realmSlug.ts` normalizes human realm names into
Blizzard's slug format (strips apostrophes, diacritics, and punctuation; collapses
spaces to hyphens). It's covered by 19 unit tests against real US/EU realm names,
including accented ones (`Confrérie du Thorium`, `Aggra (Português)`).

---

## The BiS comparison engine

`src/lib/bis/compareGear.ts` is a pure function — no I/O, fully unit-tested
(`compareGear.test.ts`, `deriveActionGroups.test.ts`). The one non-obvious piece:
**rings and trinkets are an assignment problem, not a naive slot-1-to-rank-1
comparison.** A BiS list's rank 1 + rank 2 for `finger`/`trinket` together form the
target *pair*; `compareGear` solves the tiny 2-item assignment (only 2 possible
pairings) so a player already holding BiS rank 2 in their first ring slot is
credited there, not told they're missing rank 1 in both slots.

Severity (`bis` / `close` / `upgrade` / `major-gap`) is colorblind-safe by
construction — every chip pairs a color with a distinct icon and a text label
(see `SeverityChip.tsx`), never color alone.

---

## Adding or updating BiS data

BiS lists live as versioned JSON in `data/bis/{seasonId}/{class}-{spec}.json`,
validated against `BisListSchema` (`src/lib/bis/types.ts`) both when read and
when seeded. **Currently seeded (6 specs, one per armor type):**

| Class | Spec | Armor |
|---|---|---|
| Paladin | Retribution | Plate |
| Death Knight | Frost | Plate |
| Mage | Fire | Cloth |
| Priest | Discipline | Cloth |
| Druid | Restoration | Leather |
| Hunter | Beast Mastery | Mail |

**To add a spec**, create `data/bis/{CURRENT_SEASON_ID}/{class}-{spec}.json`
(slugified, e.g. `warrior-fury.json`) matching this shape:

```jsonc
{
  "season": "midnight-s2",
  "class": "Warrior",
  "spec": "Fury",
  "armorType": "plate",
  "statPriority": ["haste", "crit", "versatility", "mastery"], // all 4, highest first
  "entries": [
    {
      "slot": "head",              // see BIS_SLOTS in src/lib/bis/types.ts —
                                    // rings/trinkets use the generic "finger"/"trinket"
                                    // slot with a ranked pool, not finger_1/finger_2
      "contentType": "raid",       // "raid" | "mythic-plus" | "pvp"
      "rank": 1,                   // 1 = true BiS, 2+ = ranked alternative
      "itemId": 123456,
      "itemName": "Example Helm",
      "itemLevel": 515,
      "source": { "type": "raid", "instance": "...", "boss": "...", "difficulty": "mythic" },
      "tierPiece": true,
      "catalystable": false,
      "statPriorityFit": 95
    }
  ]
}
```

Run `bun run test` — `loadSeeds.test.ts` schema-validates every file in the
current season's directory, so a malformed entry fails CI immediately. If you're
using Postgres (`DATABASE_URL` set), run `bun run db:seed` to load it; otherwise
it's picked up automatically from disk (see `getBisList.ts`'s zero-infra fallback).

---

## Rolling the season

Everything season-specific — raid name/bosses, M+ dungeon pool and ilvl-by-key
table, crafted ilvl caps, tier bonus text, embellishable/enchantable slots — lives
in **`src/lib/season/seasonConfig.ts`**, keyed by `CURRENT_SEASON_ID`. Bump that
one file (and drop new seed JSON under the new `data/bis/{newSeasonId}/`
directory) when a season rolls over; nothing else in the app hardcodes
season-specific values.

**Status (as of 2026-09-01)**: `seasonConfig.ts`, the `data/bis/`/`data/talents/`
directory names, and the BiS seed content itself all reflect the real current
season — Midnight Season 2, patch 12.1.0 "The Curse of Ula'tek" (raid: The
Venomous Abyss; M+ pool: Altar of Fangs, Murder Row, Den of Nalorakk, The
Blinding Vale, Voidscar Arena, King's Rest, Ruby Life Pools, Temple of
Sethraliss; real tier set names/bonuses per class). The ilvl tables (raid
difficulty bands, M+ key-level table, crafted spark caps) were provisional
through 2026-08-25 pending Blizzard's official numbers; they're now filled in
with confirmed live values, cross-checked across multiple current gearing
guides. `data/bis/midnight-s2/*.json` was fully re-authored per spec (item
names, drop sources, stat priorities) against real Season 2 guides — a few
individual item names in lower-priority fallback slots weren't confirmable
against public guide text and were coined in the raid/dungeon's established
naming style rather than left blank; `itemId` values throughout remain
synthetic placeholders (the app never uses them to look up real Blizzard
item data, only to display the name/source you already gave it).

---

## Mocked behavior

Per the "don't stub the hard parts silently" rule, every mock is marked
`// MOCK:` in source and listed here:

- **`src/lib/blizzard/mock.ts`** — fixture character profile/equipment/media/
  statistics, used for *any* character lookup whenever `BLIZZARD_CLIENT_ID`/
  `SECRET` are unset. `client.ts` stamps the requester's own region/realm/name
  into the fixture so the UI is testable with arbitrary input, not just one
  hardcoded character.
- **`src/lib/blizzard/mockRealms.ts`** — a short static realm list used for
  autocomplete in the same zero-credentials mode (real mode calls
  `/data/wow/realm/index`).

Everything else (caching, OAuth flow, realm slugging, the compare engine, the DB
schema) is real, testable code — only the Blizzard *network calls themselves* are
swapped for fixtures when credentials are absent.

---

## Known limitations / assumptions

- **Private-profile detection is heuristic.** Blizzard's modern Profile API
  doesn't expose an explicit "this profile is private" signal (that was a
  Legion-era Armory toggle) — a private or never-logged-in character 404s
  exactly like a nonexistent one. We treat "profile resolves but equipment
  404s" as the private case (`CharacterPrivateError` in `errors.ts`); revisit
  if Blizzard ever reintroduces a real signal.
- **Off-hand itemization is simplified.** Every seeded spec includes an
  `off_hand` BiS entry for pipeline-proving purposes, even though several
  (Retribution Paladin, Fire Mage, etc.) wouldn't realistically itemize an
  off-hand slot in-game. Cosmetic simplification, not a data bug.
- **Embellishable slots are hardcoded** (`seasonConfig.embellishableSlots`) since
  which slots can carry a crafted embellishment rotates by patch and isn't
  exposed by the API.
- **Stat-rating-to-percent conversion** (`domain.ts`'s `ratingToPercent`) is a
  flat approximation for the stats panel's bar chart, not combat-log accurate.

---

## Accessibility

Keyboard-navigable slot grid and tabs (native `<button>`s + Radix primitives),
visible focus rings throughout, `aria-label`s on icon-only/ambiguous controls, a
skip-to-content link, and a `role="progressbar"` completion meter. Canonical WoW
item-quality colors (epic purple, rare blue, etc.) are used only for icon
**borders** — several of them fall below WCAG AA's 4.5:1 text-contrast minimum
against our dark panel background, so item-name text always renders in the
default high-contrast color instead. All transitions stay under 200ms and respect
`prefers-reduced-motion`.

---

## Deploying to Vercel

```sh
vercel
```

The `@astrojs/vercel` adapter (already configured in `astro.config.mjs`, `output:
'server'`) needs no extra `vercel.json`. Set the environment variables from
`.env.example` in the Vercel project settings. The OG image route
(`src/pages/og/**/*.png.ts`) uses `@vercel/og` and works on Vercel's default
Node/Edge runtime with no extra config.

---

## Legal

Not affiliated with or endorsed by Blizzard Entertainment. World of Warcraft and
all related assets are the property of Blizzard Entertainment, Inc. No game
assets are rehosted — icons and character renders are loaded directly from
Blizzard's own media URLs.
