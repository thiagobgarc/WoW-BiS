/**
 * @mythos/api-contract — the Zod schema for every /v1 request and response.
 *
 * The permanent contract. Once a build ships to a store, old installs call
 * /v1 for years, so this is additive-only: a breaking change gets a /v2
 * alongside it, never a mutation of these schemas. See docs/api-contract.md
 * for the prose version and the per-endpoint rate limits.
 *
 * Both sides parse against these: apps/web's contract tests parse the
 * routes' own output (so drift fails CI, not a shipped phone), and
 * @mythos/api-client parses every response before it reaches app code.
 */
export * from './error';
export * from './common';
export * from './meta';
export * from './realms';
export * from './character';
export * from './bis';
export * from './metaBrowse';

/** Every /v1 path this contract covers, for building request URLs. */
export const V1_BASE_PATH = '/api/v1';
