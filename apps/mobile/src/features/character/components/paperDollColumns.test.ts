/**
 * Kept as its own file rather than living in a `PaperDoll.test.tsx`: what is
 * being tested is a breakpoint table, and importing the component to reach
 * it would pull expo-image and the whole tile tree into a test that renders
 * nothing.
 */
import { paperDollColumns } from './PaperDoll';

describe('paperDollColumns', () => {
  it.each([
    // Every phone in portrait, down to the narrowest still sold.
    [320, 2],
    [390, 2],
    [430, 2],
    // Phones in landscape and small tablets in portrait.
    [640, 3],
    [834, 3],
    // Tablets in landscape.
    [1024, 4],
    [1366, 4],
  ])('gives %ipt %i columns', (width, columns) => {
    expect(paperDollColumns(width)).toBe(columns);
  });

  it('never returns zero, which would divide the row width by nothing', () => {
    expect(paperDollColumns(0)).toBeGreaterThan(0);
  });
  it.each([
    // The sizes iOS and Android actually offer, on a 390pt phone. Two
    // columns survive the ordinary large-text range; only the
    // accessibility sizes collapse the grid, which is the point.
    [1, 2],
    [1.15, 2],
    [1.35, 2],
    [1.5, 2],
    [2, 1],
    [2.35, 1],
  ])('gives a 390pt phone at %ix text %i columns', (fontScale, columns) => {
    expect(paperDollColumns(390, fontScale)).toBe(columns);
  });

  it('still fills a tablet at large text rather than stranding one column', () => {
    expect(paperDollColumns(1024, 1.35)).toBe(3);
  });

  it('treats a scale below 1 as 1, so shrunk text never packs in more columns', () => {
    // Android allows text smaller than default. Four tiny columns on a
    // phone is not a feature anyone asked for.
    expect(paperDollColumns(390, 0.85)).toBe(paperDollColumns(390, 1));
  });
});
