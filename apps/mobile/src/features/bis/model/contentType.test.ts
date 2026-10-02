import { BIS_ENTRIES } from '@/testing/bisFixture';

import {
  contentSegments,
  contentTypeLabel,
  defaultContentType,
  emptyBoardMessage,
  seededContentTypes,
} from './contentType';

const RAID_ONLY = BIS_ENTRIES.filter((entry) => entry.contentType === 'raid');
const MYTHIC_PLUS_ONLY = BIS_ENTRIES.filter((entry) => entry.contentType === 'mythic-plus');

describe('contentTypeLabel', () => {
  it('spells Mythic+ the way the game does, not the way the enum does', () => {
    expect(contentTypeLabel('mythic-plus')).toBe('Mythic+');
  });
});

describe('seededContentTypes', () => {
  it('reports only what the payload actually carries', () => {
    expect([...seededContentTypes(BIS_ENTRIES)].sort()).toEqual(['mythic-plus', 'raid']);
  });
});

describe('contentSegments', () => {
  it('keeps every segment and hints the empty ones', () => {
    const segments = contentSegments(BIS_ENTRIES);

    // A control that changes shape as you tap through it is worse than one
    // that sometimes has nothing behind a segment.
    expect(segments.map((segment) => segment.id)).toEqual(['raid', 'mythic-plus', 'pvp']);
    expect(segments[0]?.accessibilityHint).toBeUndefined();
    expect(segments[2]?.accessibilityHint).toBe('No BiS list this season');
  });
});

describe('defaultContentType', () => {
  it('opens on raid when raid is seeded', () => {
    expect(defaultContentType(RAID_ONLY)).toBe('raid');
  });

  it('opens on the first seeded segment rather than an empty board', () => {
    expect(defaultContentType(MYTHIC_PLUS_ONLY)).toBe('mythic-plus');
  });

  it('falls back to raid when nothing is seeded at all', () => {
    // The board replaces itself with the not-seeded notice in this case, so
    // the value only has to be defined, not correct.
    expect(defaultContentType([])).toBe('raid');
  });
});

describe('emptyBoardMessage', () => {
  it('names the season when /v1/meta has resolved', () => {
    expect(emptyBoardMessage('pvp', 'The War Within Season 2')).toBe(
      'No PvP BiS list has been seeded for this spec for The War Within Season 2.',
    );
  });

  it('still reads as a sentence when it has not', () => {
    expect(emptyBoardMessage('pvp')).toBe(
      'No PvP BiS list has been seeded for this spec this season.',
    );
  });
});
