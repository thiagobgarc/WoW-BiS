import { formatRunDuration, formatScore, runSummaryLabel } from './runFormat';

describe('formatRunDuration', () => {
  it('renders m:ss with a padded seconds field', () => {
    expect(formatRunDuration(1_624_000)).toBe('27:04');
  });

  it('renders a sub-minute run without a leading zero on the minutes', () => {
    expect(formatRunDuration(45_000)).toBe('0:45');
  });

  it('rounds to the nearest second', () => {
    expect(formatRunDuration(59_600)).toBe('1:00');
  });

  it('floors at zero rather than printing a negative clock', () => {
    expect(formatRunDuration(-5_000)).toBe('0:00');
  });
});

describe('formatScore', () => {
  it('keeps one decimal, as the game does', () => {
    expect(formatScore(212)).toBe('212.0');
  });

  it('renders a missing score as an em dash, not as zero', () => {
    // Zero is a real score. "No score reported" is not the same thing.
    expect(formatScore(null)).toBe('—');
  });
});

describe('runSummaryLabel', () => {
  const run = { level: 12, timed: true, score: 212.4, durationMs: 1_624_000, completedAt: 0 };

  it('spells out "timed", which the card carries only as a colored glyph', () => {
    expect(runSummaryLabel('Ara-Kara', run)).toContain('timed');
  });

  it('spells out "depleted" the same way', () => {
    expect(runSummaryLabel('Ara-Kara', { ...run, timed: false })).toContain('depleted');
  });

  it('describes a dungeon with no run instead of leaving it unlabelled', () => {
    expect(runSummaryLabel('Ara-Kara', null)).toBe('Ara-Kara: not run this season');
  });
});
