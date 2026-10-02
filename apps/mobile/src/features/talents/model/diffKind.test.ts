import { RECOMMENDED_TALENTS_FIXTURE, TALENTS_FIXTURE } from '@/testing/talentsFixture';

import { DIFF_KIND_STYLE, diffRowAccessibilityLabel, diffRowDetail, matchSummaryText } from './diffKind';
import { deriveTalentDiff, rowsOfKind, type TalentDiffKind } from './talentDiff';

const { rows } = deriveTalentDiff(
  TALENTS_FIXTURE.tree,
  TALENTS_FIXTURE.current,
  RECOMMENDED_TALENTS_FIXTURE,
);

function only(kind: TalentDiffKind) {
  const row = rowsOfKind(rows, kind)[0];
  if (!row) throw new Error(`no ${kind} row — the fixture no longer covers this case`);
  return row;
}

describe('DIFF_KIND_STYLE', () => {
  it('gives each kind a distinct glyph and word', () => {
    // mobile-ux.md's never-colour-alone rule, which is stated for severity
    // chips and has no reason to skip these.
    const icons = Object.values(DIFF_KIND_STYLE).map((style) => style.icon);
    const titles = Object.values(DIFF_KIND_STYLE).map((style) => style.title);

    expect(new Set(icons).size).toBe(icons.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('does not call any of them wrong', () => {
    // A recommended build is one seeded opinion about one content type.
    // The screen reports differences; it does not grade them.
    const copy = Object.values(DIFF_KIND_STYLE)
      .flatMap((style) => [style.title, style.blurb])
      .join(' ')
      .toLowerCase();

    expect(copy).not.toContain('wrong');
    expect(copy).not.toContain('should');
  });
});

describe('diffRowDetail', () => {
  it('names what you took on the other side of a choice', () => {
    expect(diffRowDetail(only('different-choice'))).toBe('You took Grip of the Dead');
  });

  it('spells out both point counts rather than only the shortfall', () => {
    expect(diffRowDetail(only('lower-rank'))).toBe('You have 1 of 2; the build takes 2');
  });

  it('adds nothing to a plainly missing talent', () => {
    const missing = rowsOfKind(rows, 'missing').find((row) => !row.unknown);
    expect(missing && diffRowDetail(missing)).toBeNull();
  });

  it('explains an unknown node instead of leaving a bare id on screen', () => {
    const unknown = rows.find((row) => row.unknown);
    expect(unknown && diffRowDetail(unknown)).toContain('older version of the tree');
  });
});

describe('diffRowAccessibilityLabel', () => {
  it('reads as one sentence: talent, tree, kind, specifics', () => {
    expect(diffRowAccessibilityLabel(only('different-choice'))).toBe(
      "Death's Reach. Class talent. Different choice. You took Grip of the Dead",
    );
  });

  it('drops the specifics clause when there is nothing to add', () => {
    const missing = rowsOfKind(rows, 'missing').find((row) => !row.unknown);
    expect(missing && diffRowAccessibilityLabel(missing)).toBe(
      'Blinding Sleet. Class talent. Not taken.',
    );
  });
});

describe('matchSummaryText', () => {
  it('counts picks rather than showing a percentage', () => {
    // "77%" invites optimising a number that is one seeded opinion.
    expect(matchSummaryText(5, 9)).toBe('5 of 9 picks match');
  });
});
