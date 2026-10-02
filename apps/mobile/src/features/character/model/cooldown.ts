/**
 * The 60s-per-character refresh cooldown, as the user sees it.
 *
 * The server owns the real cooldown — `refreshCharacter` in apps/web's
 * `client.ts` keys it per character and answers `429` with
 * `retryAfterSeconds` while it holds. This module is only the client's
 * picture of it, and it exists so the refresh control can say "try again in
 * 41s" instead of showing a bare error, which is what mobile-ux.md's
 * `RefreshButton` row asks for.
 *
 * **The 429's `retryAfterSeconds` is the full cooldown, not the remainder.**
 * `refreshCharacter` returns the constant `REFRESH_COOLDOWN_SECONDS`
 * whenever the cooldown key is present, so a client that has been on
 * cooldown for 55 seconds is still told "60". That makes the countdown an
 * upper bound: it can over-wait, never under-wait. Which is why a
 * *successful* refresh starts a local cooldown of its own — that one is
 * anchored to the moment the server actually reset the timer, so it is the
 * accurate branch, and the 429 is the fallback for a cooldown this install
 * didn't start (another device, or a relaunch).
 */

/** Mirrors REFRESH_COOLDOWN_SECONDS in apps/web's blizzard/client.ts. */
export const REFRESH_COOLDOWN_SECONDS = 60;

/** Milliseconds; `null` means "no cooldown running". */
export type CooldownUntil = number | null;

export function cooldownFrom(seconds: number, now: number): number {
  return now + seconds * 1000;
}

/** Rounds up, so the last partial second still reads as 1 rather than 0. */
export function cooldownSecondsLeft(until: CooldownUntil, now: number): number {
  if (until === null) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/**
 * Deliberately not "0:41" — a sub-minute wait reads faster as a bare number
 * of seconds, and this value is never over 60.
 */
export function cooldownMessage(secondsLeft: number): string {
  return `Refreshed a moment ago — try again in ${secondsLeft}s.`;
}
