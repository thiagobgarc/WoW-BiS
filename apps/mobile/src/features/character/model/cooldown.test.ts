import {
  cooldownFrom,
  cooldownMessage,
  cooldownSecondsLeft,
  REFRESH_COOLDOWN_SECONDS,
} from './cooldown';

describe('cooldownFrom', () => {
  it('converts the contract\'s seconds into a wall-clock deadline', () => {
    expect(cooldownFrom(60, 1_000_000)).toBe(1_060_000);
  });
});

describe('cooldownSecondsLeft', () => {
  it('is zero when no cooldown is running', () => {
    expect(cooldownSecondsLeft(null, Date.now())).toBe(0);
  });

  it('never goes negative once the deadline has passed', () => {
    expect(cooldownSecondsLeft(1_000, 9_000)).toBe(0);
  });

  it('rounds up, so the last fraction of a second still reads as 1', () => {
    // Rounding down would show "0s" for a full second while the button was
    // still disabled, which reads as a stuck app.
    expect(cooldownSecondsLeft(1_100, 1_000)).toBe(1);
    expect(cooldownSecondsLeft(1_001, 1_000)).toBe(1);
  });

  it('counts a full cooldown as its whole length', () => {
    const now = 5_000;
    const until = cooldownFrom(REFRESH_COOLDOWN_SECONDS, now);
    expect(cooldownSecondsLeft(until, now)).toBe(REFRESH_COOLDOWN_SECONDS);
  });
});

describe('cooldownMessage', () => {
  it('states the wait in seconds rather than as a clock', () => {
    expect(cooldownMessage(41)).toBe('Refreshed a moment ago — try again in 41s.');
  });
});

describe('REFRESH_COOLDOWN_SECONDS', () => {
  it("matches the server's own cooldown", () => {
    // apps/web/src/lib/blizzard/client.ts. If that changes, a successful
    // refresh here starts a countdown that disagrees with the 429 the next
    // attempt would get.
    expect(REFRESH_COOLDOWN_SECONDS).toBe(60);
  });
});
