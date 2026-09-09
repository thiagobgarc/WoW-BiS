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
});
