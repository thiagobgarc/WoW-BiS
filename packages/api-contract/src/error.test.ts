import { describe, expect, it } from 'vitest';
import {
  ApiErrorCodeSchema,
  ApiErrorEnvelopeSchema,
  RETRYABLE_ERROR_CODES,
  RateLimitedEnvelopeSchema,
  isRetryableCode,
} from './error';

describe('error envelope', () => {
  it('treats exactly the two transient conditions as retryable', () => {
    const retryable = ApiErrorCodeSchema.options.filter(isRetryableCode);
    expect(retryable).toEqual([...RETRYABLE_ERROR_CODES]);
  });

  it('rejects an envelope missing the retryable flag', () => {
    const result = ApiErrorEnvelopeSchema.safeParse({
      error: { code: 'character_not_found', message: 'nope' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a code outside the enum, so a client never branches on an unknown string', () => {
    const result = ApiErrorEnvelopeSchema.safeParse({
      error: { code: 'teapot', message: 'nope', retryable: false },
    });
    expect(result.success).toBe(false);
  });

  // The whole point of the correction documented in error.ts: a 429 is
  // still a normal error envelope, so a client that only knows
  // ApiErrorEnvelopeSchema can still read the code and message off it.
  it('keeps a rate-limited response parseable as a plain error envelope', () => {
    const body = {
      error: { code: 'rate_limited', message: 'Slow down.', retryable: true },
      retryAfterSeconds: 42,
    };

    expect(RateLimitedEnvelopeSchema.parse(body).retryAfterSeconds).toBe(42);
    expect(ApiErrorEnvelopeSchema.parse(body).error.code).toBe('rate_limited');
  });
});
