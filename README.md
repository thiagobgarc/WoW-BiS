# Mythos

## Enjoy my work? Feel free to **[Buy Me A Coffee](https://buymeacoffee.com/thiagobgarc)**

Mythos is a Best-in-Slot gear planner for World of Warcraft. It is live at **[mythosbis.com](https://mythosbis.com)**.

You type in your character name, realm and region. Mythos pulls your equipped gear from the Blizzard API and compares it slot by slot against the BiS list for your class and spec. It then shows you what to replace, where each item drops, and how close you are to being fully BiS.

## What you can do on the site

- Look up any character and see a paper doll of their current gear
- See an upgrade board with every slot that still needs work
- Browse BiS gear pages for every class and spec
- Check talent builds for each spec, decoded from real in-game export strings

## How the repo is laid out

This is a Bun workspaces monorepo. The web app and the mobile app share the same domain logic.

```
apps/
  web/       Astro + React web app (the site at mythosbis.com)
  mobile/    React Native (Expo) app
packages/
  core/          Shared domain logic (no React, no I/O)
  api-contract/  The versioned /v1 API types
  api-client/    Client the mobile app uses to call /v1
docs/
  architecture.md    Layering, bounded contexts and the target shape
  api-contract.md    The /v1 HTTP API the mobile app talks to
  mobile-ux.md       How the web screens map to mobile
```

## Running it locally

```sh
bun install
bun run dev       # web app at localhost:4321
bun run test      # unit tests for every package and app
bun run typecheck # type checks for every package and app
```

You do not need any environment variables to run it. Without Blizzard credentials, every Blizzard call returns realistic mock data. To use real data, copy `apps/web/.env.example` to `apps/web/.env` and fill in your keys from [develop.battle.net](https://develop.battle.net/access/clients). The full setup is in `apps/web/README.md`.

Also, the mobile app runs with `bun run mobile`. Read `docs/` before writing any mobile code.

## Deployment

The site is hosted on Vercel and served at [mythosbis.com](https://mythosbis.com). Every push to `main` deploys to production. Work happens on `development` and gets merged into `main` when it is ready.

## How the BiS lists are made

The lists come from what the best players actually wear, the same way Archon does it. For raid, it samples the top Mythic parsers for each spec on Warcraft Logs. For Mythic+, it samples the top players on Raider.IO. Then it reads their current gear from the Blizzard API and ranks each slot by how many of them use the item. Slots with too few players fall back to ranking drops by stat priority.

A GitHub Action (`.github/workflows/refresh-bis.yml`) reruns this every Tuesday after reset and commits the new lists to `main`, so the site redeploys with them. You can also run it by hand from the Actions tab, or locally with `bun run bis:ingest` in `apps/web`.

## How the tier lists are made

The Mythic+ and raid tier lists on `/meta` are measured from player data, using the same figure Archon uses: each spec's 95th percentile. For Mythic+ that is the Mythic+ score at the 95th percentile of every ranked character of the spec on Raider.IO. For raid it is the DPS (HPS for healers) at the 95th percentile of the spec's Mythic parses on Warcraft Logs, averaged over the first four bosses. A spec's tier is how close it is to the best spec in its role: S within 3%, A within 7%, B within 12%, C below that.

The raid list comes in Mythic, Heroic and Normal, switchable on the page. Warcraft Logs' public API lists at most 2,000 parses per spec and boss. On Mythic, specs under that are counted exactly and the rest have their parse count estimated from their player population. On Heroic and Normal every spec passes it, so each spec is read at the same share of its own parses instead (scaled by population), which compares them at one shared percentile close to the 95th. The same Action rebuilds both lists after the BiS lists each week. Locally, run `bun run tiers:ingest` in `apps/web`.
