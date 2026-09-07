/**
 * Re-export shim. The meta tier-list schema moved to packages/core in
 * Phase 3 (`@mythos/core/meta`) — it's a pure Zod schema over our own seed
 * data, and `MetaTierSchema` is part of the `/v1/character/...` response,
 * so packages/api-contract needs it. Kept here so the app's existing
 * `@/lib/meta/types` imports are unaffected, exactly as domain.ts does for
 * the character types moved in Phase 2.
 */
export * from '@mythos/core/meta';
