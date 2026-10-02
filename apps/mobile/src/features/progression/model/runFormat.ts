/**
 * Formatting for Mythic+ runs.
 *
 * Small enough to inline — `apps/web`'s `MythicPlusPanel` does exactly that
 * — but a keystone level rendered as "+12" and a duration rendered as
 * "27:04" are conventions from the game, and a convention with a right
 * answer belongs somewhere a test can hold it.
 */
import type { DomainMythicPlusRun } from '@mythos/core/progression';

/** `m:ss`, matching the in-game and Raider.IO presentation. */
export function formatRunDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** One decimal, or an em dash — Blizzard omits the score on some runs. */
export function formatScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(1);
}

/**
 * What a screen reader reads for one dungeon row.
 *
 * "Timed" and "depleted" are the only piece of this card carried visually by
 * a colored glyph, so they are spelled out here in words — the same
 * colorblind-safe rule mobile-ux.md states for severity chips, applied to
 * the check and cross.
 */
export function runSummaryLabel(dungeon: string, run: DomainMythicPlusRun | null): string {
  if (!run) return `${dungeon}: not run this season`;

  return [
    `${dungeon}: keystone level ${run.level}`,
    run.timed ? 'timed' : 'depleted',
    `score ${formatScore(run.score)}`,
    `in ${formatRunDuration(run.durationMs)}`,
  ].join(', ');
}
