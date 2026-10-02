/**
 * The one error shape every /v1 route returns. Extends — never replaces —
 * apps/web's existing toApiError(): the five typed Blizzard errors keep
 * their status codes and human messages, and /v1 adds a `retryable` flag
 * and nests the whole thing under an `error` key. The pre-existing
 * `/api/*` routes the web app uses are deliberately untouched by this.
 *
 * `code` is what a client branches on for its per-error screens (see
 * docs/mobile-ux.md); `message` is human-facing and may change freely, so
 * clients must never match on it.
 */
import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'character_not_found',
  'character_private',
  'realm_not_resolved',
  'blizzard_unavailable',
  'blizzard_error',
  'rate_limited',
  'invalid_region',
  'update_required',
  'unknown',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

/**
 * Whether a client should offer "try again" for a given code. Only the two
 * transient conditions qualify: a not-found character or a private profile
 * will fail identically on retry, and retrying them just burns the user's
 * rate-limit budget.
 *
 * Single source of truth for both sides — the server stamps the flag from
 * this table, the client reads it off the response rather than re-deriving
 * it, so the two can't disagree.
 */
export const RETRYABLE_ERROR_CODES = ['blizzard_unavailable', 'rate_limited'] as const;

export function isRetryableCode(code: ApiErrorCode): boolean {
  return (RETRYABLE_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * A 429 carries one extra field on top of the standard envelope so a client
 * can schedule its retry instead of guessing.
 *
 * Correction to docs/api-contract.md's original draft, which specced the
 * refresh cooldown as a bare `{ error: 'rate_limited', message,
 * retryAfterSeconds }` object unioned into the success schema. That would
 * have given clients two mutually incompatible error shapes to handle
 * depending on which route they called. This keeps the envelope and adds
 * to it, so `parseErrorEnvelope` handles every /v1 failure uniformly.
 */
export const RateLimitedEnvelopeSchema = z.object({
  error: z.object({
    code: z.literal('rate_limited'),
    message: z.string(),
    retryable: z.literal(true),
  }),
  retryAfterSeconds: z.number(),
});
export type RateLimitedEnvelope = z.infer<typeof RateLimitedEnvelopeSchema>;
