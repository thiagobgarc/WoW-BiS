/**
 * @mythos/api-client — the typed, schema-validating client for /v1.
 *
 * Depends on @mythos/api-contract and @mythos/core only: no React, no
 * platform APIs, no ambient fetch. The concrete fetch and base URL are the
 * caller's to supply (architecture.md Section 2 — infrastructure depends on
 * domain-defined interfaces, never the reverse), which is also what makes
 * the whole surface testable against a stub.
 */
export * from './client';
export * from './errors';
export * from './version';
