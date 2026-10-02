import { describe, expect, it } from 'vitest';
import { decodeLoadout, LoadoutDecodeError, readLoadoutHeader } from './exportString';
// Two real Frost Mage export strings as published, plus that spec's real
// serialization order — see the fixture's `source`.
import fixture from './exportString.fixture.json';

describe('decodeLoadout', () => {
  it('reads the header of a real export string', () => {
    expect(readLoadoutHeader(fixture.strings[0]!)).toEqual({ version: 2, specId: 64 });
  });

  it('walks every node of a real string and lands on clean padding', () => {
    for (const str of fixture.strings) {
      const decoded = decodeLoadout(str, fixture.fullNodeOrder);
      expect(decoded.specId).toBe(fixture.specId);
      expect(decoded.leftoverBits).toBeLessThan(6);
      expect(decoded.paddingClean).toBe(true);
      expect(decoded.picks.length).toBeGreaterThan(60);
      expect(decoded.picks.every((p) => fixture.fullNodeOrder.includes(p.nodeId))).toBe(true);
    }
  });

  it('exposes a wrong node order as misalignment instead of returning a plausible build', () => {
    const truncated = fixture.fullNodeOrder.slice(0, -40);
    const decoded = decodeLoadout(fixture.strings[0]!, truncated);
    expect(decoded.leftoverBits >= 6 || !decoded.paddingClean).toBe(true);
  });

  it('rejects a string that ends before the tree does', () => {
    expect(() => decodeLoadout(fixture.strings[0]!.slice(0, 40), fixture.fullNodeOrder)).toThrow(LoadoutDecodeError);
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => readLoadoutHeader('CAE!AAAA')).toThrow(LoadoutDecodeError);
  });
});
