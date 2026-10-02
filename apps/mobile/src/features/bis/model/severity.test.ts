/**
 * The rows come from `compareGear` over the real fixture rather than from
 * hand-built literals. Two reasons: the interesting inputs here are the
 * ones a hand-built row gets subtly wrong (a `bis` severity with no target
 * is not the same as a match), and the fixture is asserted to still produce
 * every branch — so a seed change that quietly flattened it fails here.
 */
import { compareGear, type ComparisonRow } from '@mythos/core/bis';
import type { EquipmentSlot } from '@mythos/core/character';

import { CHARACTER_FIXTURE } from '@/testing/characterFixture';

import { deltaLabel, rowAccessibilityLabel, SEVERITY_STYLE } from './severity';

const raid = compareGear(CHARACTER_FIXTURE.equipment, CHARACTER_FIXTURE.bis.entries, 'raid');
const mythicPlus = compareGear(
  CHARACTER_FIXTURE.equipment,
  CHARACTER_FIXTURE.bis.entries,
  'mythic-plus',
);

function row(result: { rows: ComparisonRow[] }, slot: EquipmentSlot): ComparisonRow {
  const found = result.rows.find((candidate) => candidate.physicalSlot === slot);
  if (!found) throw new Error(`no ${slot} row — the fixture no longer covers this case`);
  return found;
}

describe('SEVERITY_STYLE', () => {
  it('gives each severity a distinct glyph, not the same shape in four colours', () => {
    // mobile-ux.md's colorblind-safe rule: colour *and* glyph *and* word.
    // Four fills of one circle is a colour-only distinction wearing a hat.
    const icons = Object.values(SEVERITY_STYLE).map((style) => style.icon);
    expect(new Set(icons).size).toBe(icons.length);

    const labels = Object.values(SEVERITY_STYLE).map((style) => style.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('deltaLabel', () => {
  it('says a slot is done rather than "+0 iLvl"', () => {
    expect(deltaLabel(row(raid, 'head'))).toBe('Match');
  });

  it('names the gap in item levels when there is one', () => {
    expect(deltaLabel(row(raid, 'main_hand'))).toBe('+12 iLvl');
  });

  it('asks for an empty slot to be filled instead of quoting the target ilvl', () => {
    // compareGear reports the whole target item level as the delta here,
    // and "+648 iLvl" is not a number anyone can act on.
    expect(deltaLabel(row(raid, 'off_hand'))).toBe('Fill now');
  });

  it('never prints a negative upgrade', () => {
    const neck = row(raid, 'neck');
    expect(neck.ilvlDelta).toBeLessThan(0);
    expect(deltaLabel(neck)).toBe('At or above');
  });

  it('distinguishes "no target" from "already best in slot"', () => {
    // Both are severity 'bis' out of compareGear; only one is a match.
    const second = row(mythicPlus, 'finger_2');
    expect(second.severity).toBe('bis');
    expect(second.isMatch).toBe(false);
    expect(deltaLabel(second)).toBe('No target');
  });
});

describe('rowAccessibilityLabel', () => {
  it('reads as one sentence: slot, severity, equipped, target, gap', () => {
    expect(rowAccessibilityLabel(row(raid, 'chest'))).toBe(
      'Chest. Major gap. Equipped: chest of the Abyss, item level 636. Target: Chestplate of the Venom Court, item level 660, BiS rank 1, from Heroic — Sylvara, The Venomous Abyss. +24 iLvl.',
    );
  });

  it('says what is missing when the slot is empty', () => {
    expect(rowAccessibilityLabel(row(raid, 'off_hand'))).toContain('Nothing equipped.');
  });

  it('does not describe a target for a slot that already has the right item', () => {
    const label = rowAccessibilityLabel(row(raid, 'head'));
    expect(label).toContain('This is the BiS item.');
    expect(label).not.toContain('BiS rank');
  });

  it('says a slot has no target this season rather than staying silent', () => {
    expect(rowAccessibilityLabel(row(mythicPlus, 'finger_2'))).toContain(
      'No BiS target for this slot this season.',
    );
  });
});
