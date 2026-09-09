/**
 * Seconds remaining until `until`, re-rendering once a second and stopping
 * dead at zero.
 *
 * A ticking clock is the one thing a cooldown countdown needs and the one
 * thing a pure function can't provide, so it is isolated here rather than
 * living inside the refresh hook: the arithmetic stays in `cooldown.ts`
 * where it can be tested without timers, and this file holds only the
 * interval.
 *
 * The interval is torn down as soon as the countdown reaches zero, so an
 * idle character screen schedules nothing — a 1Hz timer left running behind
 * an idle screen is a battery cost with no display to justify it.
 */
import { useEffect, useState } from 'react';

import { cooldownSecondsLeft, type CooldownUntil } from './cooldown';

export function useCountdown(until: CooldownUntil): number {
  const [secondsLeft, setSecondsLeft] = useState(() => cooldownSecondsLeft(until, Date.now()));

  useEffect(() => {
    const remaining = cooldownSecondsLeft(until, Date.now());
    setSecondsLeft(remaining);
    if (remaining === 0) return;

    const interval = setInterval(() => {
      const next = cooldownSecondsLeft(until, Date.now());
      setSecondsLeft(next);
      if (next === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [until]);

  return secondsLeft;
}
