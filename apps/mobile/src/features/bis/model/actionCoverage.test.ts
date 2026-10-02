/**
 * The defect this guards against is a *sentence*, not a crash: the board
 * telling someone "every slot with a target is already best in slot" with
 * Major-gap rows still on screen above it. It survived Phase 7's fixtures
 * and was only caught on a device, so the cases below are written from the
 * eight source types rather than from the fixture — the fixture happens to
 * contain vault entries today and might not tomorrow.
 */
import type { ComparisonRow } from '@mythos/core/bis';

import { unroutedMessage, unroutedUpgradeSlots } from './actionCoverage';

type Source = NonNullable<ComparisonRow['target']>['source'];

/** Only the four fields these functions read; the rest is noise here. */
function row(
  severity: ComparisonRow['severity'],
  physicalSlot: string,
  source: Source | null,
  ilvlDelta = 13,
): ComparisonRow {
  return {
    bisSlot: physicalSlot,
    physicalSlot,
    equipped: null,
    target: source ? { itemName: 'Something', source } : null,
    alternatives: [],
    severity,
    ilvlDelta,
    isMatch: false,
  } as unknown as ComparisonRow;
}

describe('unroutedUpgradeSlots', () => {
  it.each([
    ['vault', { type: 'vault' }],
    ['pvp', { type: 'pvp' }],
    ['world', { type: 'world' }],
    ['profession', { type: 'profession' }],
  ] as const)('counts a %s target, which no panel groups', (_name, source) => {
    expect(unroutedUpgradeSlots([row('upgrade', 'neck', source as Source)])).toEqual(['Neck']);
  });

  it.each([
    ['raid', { type: 'raid', boss: 'Sylvara', instance: 'The Venomous Abyss' }],
    ['dungeon', { type: 'dungeon', dungeon: 'The Dawnbreaker' }],
    ['crafted', { type: 'crafted', craftQuality: 5 }],
    ['catalyst', { type: 'catalyst' }],
  ] as const)('leaves a %s target alone — a panel already routes it', (_name, source) => {
    expect(unroutedUpgradeSlots([row('upgrade', 'neck', source as Source)])).toEqual([]);
  });

  it('counts a raid source with no boss, which the panel drops just as silently', () => {
    expect(unroutedUpgradeSlots([row('major-gap', 'back', { type: 'raid' } as Source)])).toEqual(['Back']);
  });

  it('counts a dungeon source with no dungeon name', () => {
    expect(unroutedUpgradeSlots([row('upgrade', 'waist', { type: 'dungeon' } as Source)])).toEqual(['Waist']);
  });

  it('ignores a slot whose equipped item out-levels the list', () => {
    // compareGear calls this 'close' with a negative delta. The panels drop
    // it correctly — there is nothing to go and get — so naming it as an
    // upgrade with no route would be a new false claim, not a fixed one.
    expect(unroutedUpgradeSlots([row('close', 'neck', { type: 'vault' } as Source, -6)])).toEqual([]);
  });

  it('ignores rows that want nothing: a match, and a slot with no target', () => {
    const rows = [
      row('bis', 'head', { type: 'vault' } as Source),
      row('upgrade', 'finger1', null),
    ];
    expect(unroutedUpgradeSlots(rows)).toEqual([]);
  });
});

describe('unroutedMessage', () => {
  it('says nothing when there is nothing to say', () => {
    expect(unroutedMessage([])).toBeNull();
  });

  it('names the single slot rather than counting to one', () => {
    expect(unroutedMessage(['Neck'])).toMatch(/^Neck has an upgrade with no farm route/);
  });

  it('counts and then lists when there are several', () => {
    const message = unroutedMessage(['Neck', 'Back']);
    expect(message).toMatch(/^2 upgrades have no farm route/);
    expect(message).toContain('Neck, Back');
  });
});
