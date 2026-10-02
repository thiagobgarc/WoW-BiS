# Mythos

A Bun workspaces monorepo for the Mythos WoW gear-planning product: the
existing web app, and a React Native mobile client sharing its domain logic.

```
apps/
  web/       Astro + React web app (see apps/web/README.md) — the original product
  mobile/    React Native (Expo) client — not yet scaffolded, see docs/architecture.md Phase 4
packages/
  core/      Pure domain logic shared by both apps (no React, no I/O)
docs/
  architecture.md    Layering, bounded contexts, rejected alternatives, target shape
  api-contract.md    The versioned /v1 HTTP API mobile talks to
  mobile-ux.md       Web -> mobile UX mapping
```

## Quick start

```sh
bun install
bun run dev       # apps/web, at localhost:4321
bun run test      # packages/core + apps/web unit suites
bun run typecheck # packages/core + apps/web
```

See `apps/web/README.md` for the web app's own setup (env vars, DB, mocked
behavior) — none of that changed by the monorepo move. See `docs/` for the
mobile app's architecture before writing any mobile code.
