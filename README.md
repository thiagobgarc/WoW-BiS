# Mythos

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
