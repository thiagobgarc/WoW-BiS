import { MythosApiError } from '@mythos/api-client';
import { ApiErrorCodeSchema } from '@mythos/api-contract';

import { characterErrorCopy, unsupportedRegionCopy } from './errorCopy';

describe('characterErrorCopy', () => {
  it('has copy for every code the contract can produce', () => {
    // A code added to the contract with no copy here would fall through to
    // `undefined` and render a blank screen, which is worse than the error.
    for (const code of ApiErrorCodeSchema.options) {
      const copy = characterErrorCopy(new MythosApiError({ code, message: 'x' }));
      expect(copy.title).toBeTruthy();
      expect(copy.body).toBeTruthy();
    }
  });

  it('covers the two codes only a client can produce', () => {
    expect(characterErrorCopy(new MythosApiError({ code: 'network', message: 'x' })).title).toBeTruthy();
    expect(
      characterErrorCopy(new MythosApiError({ code: 'invalid_response', message: 'x' })).title,
    ).toBeTruthy();
  });

  it('offers a retry only for failures a retry could change', () => {
    const notFound = characterErrorCopy(new MythosApiError({ code: 'character_not_found', message: 'x' }));
    const unavailable = characterErrorCopy(new MythosApiError({ code: 'blizzard_unavailable', message: 'x' }));

    expect(notFound.canRetry).toBe(false);
    expect(unavailable.canRetry).toBe(true);
  });

  it("defers to the error's own retryable flag rather than re-deriving it", () => {
    // The server stamps `retryable` and the client reads it off the wire, so
    // the two can never disagree — including when the server is ahead of us.
    const forced = new MythosApiError({ code: 'character_private', message: 'x', retryable: true });
    expect(characterErrorCopy(forced).canRetry).toBe(true);
  });

  it('falls back to the unknown copy for anything that is not an api error', () => {
    expect(characterErrorCopy(new Error('boom')).title).toBe('Something went wrong');
    expect(characterErrorCopy('boom').title).toBe('Something went wrong');
  });
});

describe('unsupportedRegionCopy', () => {
  it('quotes back what the link actually said', () => {
    expect(unsupportedRegionCopy('mars').body).toContain('"mars"');
  });

  it('handles a link with no region at all', () => {
    expect(unsupportedRegionCopy(undefined).body).toContain('missing a region');
  });

  it('never offers a retry — the link is wrong, not the network', () => {
    expect(unsupportedRegionCopy('mars').canRetry).toBe(false);
  });
});
