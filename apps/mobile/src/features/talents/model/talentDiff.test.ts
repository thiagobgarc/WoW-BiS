/**
 * The whole point of these is the arithmetic: `diffTalents` owns the
 * headline "x of y", and this derivation must not quietly disagree with it
 * — a screen that says "6 of 9 match" over a list of eight rows is worse
 * than either number alone.
 */
import { diffTalents } from '@mythos/core/talents';

import {
  RECOMMENDED_TALENTS_FIXTURE,
  TALENTS_FIXTURE,
  NO_LOADOUT_TALENTS,
} from '@/testing/talentsFixture';

import { buildGroups, deriveTalentDiff, rowsOfKind } from './talentDiff';

const diff = deriveTalentDiff(
  TALENTS_FIXTURE.tree,
  TALENTS_FIXTURE.current,
  RECOMMENDED_TALENTS_FIXTURE,
);

describe('deriveTalentDiff', () => {
  it('keeps diffTalents as the authority on the headline count', () => {
    const core = diffTalents(TALENTS_FIXTURE.current, [
      ...RECOMMENDED_TALENTS_FIXTURE.classSelections,
      ...RECOMMENDED_TALENTS_FIXTURE.specSelections,
    ]);

    expect(diff.matched).toBe(core.matched);
    expect(diff.total).toBe(core.total);
    expect(diff.matched).toBe(5);
    expect(diff.total).toBe(9);
  });

  it('separates a talent that was never taken from one taken the other way', () => {
    const missing = rowsOfKind(diff.rows, 'missing');
    const different = rowsOfKind(diff.rows, 'different-choice');

    // Both are "unmatched" to diffTalents; only one is a gap.
    expect(missing.map((row) => row.name)).toEqual(
      expect.arrayContaining(['Blinding Sleet', 'Everfrost']),
    );
    expect(different).toHaveLength(1);
    expect(different[0]?.name).toBe("Death's Reach");
    // The row has to say what you actually took, not just what you didn't.
    expect(different[0]?.currentName).toBe('Grip of the Dead');
  });

  it('reports a lower rank even though diffTalents counts it as a match', () => {
    const lower = rowsOfKind(diff.rows, 'lower-rank');

    expect(lower).toHaveLength(1);
    expect(lower[0]).toMatchObject({
      name: 'Icy Talons',
      currentRank: 1,
      recommendedRank: 2,
      maxRank: 2,
    });
  });

  it('lists the picks the build does not make, which is what pays for the rest', () => {
    const extra = rowsOfKind(diff.rows, 'extra');

    expect(extra).toHaveLength(1);
    expect(extra[0]?.name).toBe('Unholy Ground');
  });

  it('excludes hero talents from the diff entirely', () => {
    // The seeds carry no hero recommendations, so every hero pick would
    // otherwise land in `extra` and bury the real differences.
    const names = diff.rows.map((row) => row.name);
    expect(names).not.toContain("Reaper's Mark");
    expect(names).not.toContain('Wave of Souls');
  });

  it('shows a stale seed rather than dropping it out of its own total', () => {
    const unknown = diff.rows.find((row) => row.unknown);

    expect(unknown).toMatchObject({ nodeId: 999, kind: 'missing' });
    expect(unknown?.name).toContain('999');
  });

  it('ignores a structural node the character technically has selected', () => {
    // Node 105 is the top-of-tree selector: no options, so no name, so it
    // can never be a useful row.
    expect(diff.rows.some((row) => row.nodeId === 105)).toBe(false);
  });

  it('marks every recommended pick either matched or represented by a row', () => {
    const unmatchedRows = diff.rows.filter((row) => row.kind !== 'extra' && row.kind !== 'lower-rank');
    expect(diff.matched + unmatchedRows.length).toBe(diff.total);
  });

  it('treats a character with no loadout as missing everything, not as an error', () => {
    const empty = deriveTalentDiff(
      NO_LOADOUT_TALENTS.tree,
      NO_LOADOUT_TALENTS.current,
      RECOMMENDED_TALENTS_FIXTURE,
    );

    expect(empty.matched).toBe(0);
    expect(rowsOfKind(empty.rows, 'missing')).toHaveLength(9);
    expect(rowsOfKind(empty.rows, 'extra')).toHaveLength(0);
  });
});

describe('buildGroups', () => {
  const groups = buildGroups(
    TALENTS_FIXTURE.tree,
    TALENTS_FIXTURE.current,
    TALENTS_FIXTURE.heroTree,
    TALENTS_FIXTURE.heroSelections,
  );

  it('groups the character’s picks the way the web draws its three trees', () => {
    expect(groups.map((group) => group.id)).toEqual(['class', 'hero', 'spec']);
    expect(groups[1]?.title).toBe('Deathbringer');
  });

  it('lists only what is actually taken, and skips the structural node', () => {
    const classTalents = groups[0]?.talents.map((talent) => talent.name);

    expect(classTalents).toEqual([
      'Icy Talons',
      'Runic Attenuation',
      'Grip of the Dead',
      'Unholy Ground',
    ]);
    // 102 is untaken and 105 has no options — neither can appear.
    expect(groups[0]?.talents.some((talent) => talent.nodeId === 105)).toBe(false);
  });

  it('names both sides of a choice node so the pick reads as a choice', () => {
    const choice = groups[0]?.talents.find((talent) => talent.nodeId === 103);

    expect(choice?.name).toBe('Grip of the Dead');
    expect(choice?.choiceOf).toEqual(["Death's Reach", 'Grip of the Dead']);
  });

  it('drops a group with nothing in it rather than rendering an empty panel', () => {
    const noHero = buildGroups(TALENTS_FIXTURE.tree, TALENTS_FIXTURE.current, null, null);
    expect(noHero.map((group) => group.id)).toEqual(['class', 'spec']);
  });

  it('returns nothing at all for a character with no loadout', () => {
    expect(buildGroups(NO_LOADOUT_TALENTS.tree, null, null, null)).toEqual([]);
  });
});
