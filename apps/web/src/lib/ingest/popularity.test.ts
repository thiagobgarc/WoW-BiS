import { describe, expect, it } from 'vitest';
import type { BisEntry, BisSlot } from '@mythos/core/bis';
import { MIN_PLAYERS, derivePopularEntries, mergeWithFallback, type ItemDescription, type Observation } from './popularity';

const describeItem = (): ItemDescription => ({
  source: { type: 'raid', instance: 'The Venomous Abyss' },
  itemLevel: 318,
  tierPiece: false,
  statPriorityFit: 50,
});

const item = (slot: BisSlot, itemId: number, crafted = false) => ({ slot, itemId, name: `Item ${itemId}`, crafted });

/** n players, each wearing what `gear(i)` returns for player i. */
function sample(n: number, gear: (i: number) => Observation): Observation[] {
  return Array.from({ length: n }, (_, i) => gear(i));
}

describe('derivePopularEntries', () => {
  it('ranks by how many top players wear the item, with the share', () => {
    // 7 of 10 wear trinket 1, 3 wear trinket 2.
    const obs = sample(10, (i) => [item('trinket', i < 7 ? 1 : 2), item('trinket', 3)]);
    const result = derivePopularEntries('raid', obs, describeItem)!;
    const trinkets = result.entries.filter((e) => e.slot === 'trinket');
    expect(trinkets.map((e) => [e.itemId, e.popularity])).toEqual([[3, 100], [1, 70], [2, 30]]);
  });

  /** Regression: stat fit ranked trinkets by secondaries and missed the ones top players actually use. */
  it('lists crafted gear, which the loot-table pipeline could never see', () => {
    const obs = sample(10, () => [item('wrist', 99, true)]);
    const wrist = derivePopularEntries('raid', obs, describeItem)!.entries.find((e) => e.slot === 'wrist');
    expect(wrist?.itemId).toBe(99);
  });

  it('counts a player once per item even when they wear two copies', () => {
    const obs = sample(10, () => [item('finger', 5), item('finger', 5)]);
    const ring = derivePopularEntries('raid', obs, describeItem)!.entries.find((e) => e.slot === 'finger');
    expect(ring?.popularity).toBe(100);
  });

  it('ignores items only one player wears', () => {
    const obs = sample(10, (i) => [item('neck', i === 0 ? 7 : 8)]);
    const necks = derivePopularEntries('raid', obs, describeItem)!.entries.filter((e) => e.slot === 'neck');
    expect(necks.map((e) => e.itemId)).toEqual([8]);
  });

  it('leaves out the off-hand when most top players wield a two-hander', () => {
    const obs = sample(10, (i) => (i < 3 ? [item('main_hand', 1), item('off_hand', 2)] : [item('main_hand', 3)]));
    const result = derivePopularEntries('raid', obs, describeItem)!;
    expect(result.entries.some((e) => e.slot === 'off_hand')).toBe(false);
    expect(result.omitted.has('off_hand')).toBe(true);
  });

  /** Regression: "Baleful Grave-Knight's Girdle" was listed as BiS; it is a Catalyst transmog shell. */
  it('never lists a Catalyst look-alike, but still counts its wearer in the sample', () => {
    const obs = sample(10, (i) =>
      i < 6 ? [{ ...item('waist', 50), catalystAppearance: true }] : [item('waist', 60)],
    );
    const belts = derivePopularEntries('raid', obs, describeItem)!.entries.filter((e) => e.slot === 'waist');
    expect(belts.map((e) => [e.itemId, e.popularity])).toEqual([[60, 40]]);
  });

  it('gives up on a sample too small to trust', () => {
    expect(derivePopularEntries('raid', sample(MIN_PLAYERS - 1, () => [item('head', 1)]), describeItem)).toBeNull();
  });
});

describe('mergeWithFallback', () => {
  const statFit = (slot: BisSlot, itemId: number): BisEntry => ({
    slot, contentType: 'raid', rank: 1, itemId, itemName: `Fit ${itemId}`, itemLevel: 318,
    source: { type: 'raid' }, tierPiece: false, catalystable: false, statPriorityFit: 80,
  });

  it('fills slots the sample did not cover from stat fit, but not omitted ones', () => {
    const popular = [{ ...statFit('head', 1), popularity: 90 }];
    const merged = mergeWithFallback(popular, [statFit('head', 2), statFit('feet', 3), statFit('off_hand', 4)], 'raid', new Set(['off_hand']));
    expect(merged.map((e) => e.itemId)).toEqual([1, 3]);
  });
});
