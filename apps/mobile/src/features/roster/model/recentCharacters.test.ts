/**
 * The roster's rules, tested without a store, a renderer or MMKV — which is
 * the point of keeping them pure.
 */
import {
  MAX_RECENT,
  addRecent,
  matchRecent,
  parseRecentList,
  recentKey,
  type RecentCharacter,
} from './recentCharacters';

function character(overrides: Partial<RecentCharacter> = {}): RecentCharacter {
  return {
    name: 'Arthas',
    realmName: 'Illidan',
    realmSlug: 'illidan',
    region: 'us',
    className: 'Death Knight',
    ...overrides,
  };
}

describe('recentKey', () => {
  it('treats a name that differs only in case as the same character', () => {
    expect(recentKey(character({ name: 'ARTHAS' }))).toBe(recentKey(character({ name: 'arthas' })));
  });

  it('separates the same name on different realms and regions', () => {
    const illidan = recentKey(character());
    expect(recentKey(character({ realmSlug: 'stormrage' }))).not.toBe(illidan);
    expect(recentKey(character({ region: 'eu' }))).not.toBe(illidan);
  });
});

describe('addRecent', () => {
  it('puts the newest entry first', () => {
    const list = addRecent([character()], character({ name: 'Jaina', realmSlug: 'stormrage' }));
    expect(list.map((c) => c.name)).toEqual(['Jaina', 'Arthas']);
  });

  it('moves a re-visited character to the front instead of duplicating it', () => {
    const list = addRecent([character({ name: 'Jaina' }), character()], character());
    expect(list.map((c) => c.name)).toEqual(['Arthas', 'Jaina']);
    expect(list).toHaveLength(2);
  });

  it('dedupes case-insensitively, unlike the web hook it is ported from', () => {
    const list = addRecent([character({ name: 'Arthas' })], character({ name: 'arthas' }));
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('arthas');
  });

  it(`caps the list at ${MAX_RECENT}`, () => {
    const full = Array.from({ length: MAX_RECENT }, (_, i) =>
      character({ name: `Char${i}`, realmSlug: `realm-${i}` }),
    );
    const list = addRecent(full, character({ name: 'Newest', realmSlug: 'newest' }));

    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0]?.name).toBe('Newest');
    expect(list.some((c) => c.name === `Char${MAX_RECENT - 1}`)).toBe(false);
  });

  it('returns the same array when the entry is already the head, so MMKV is not rewritten', () => {
    const list = [character(), character({ name: 'Jaina', realmSlug: 'stormrage' })];
    expect(addRecent(list, character())).toBe(list);
  });

  it('still rewrites the head when something about it changed', () => {
    const list = [character({ className: null })];
    expect(addRecent(list, character())).not.toBe(list);
  });
});

describe('parseRecentList', () => {
  it('is empty for anything that is not an array', () => {
    expect(parseRecentList(undefined)).toEqual([]);
    expect(parseRecentList(null)).toEqual([]);
    expect(parseRecentList('[]')).toEqual([]);
    expect(parseRecentList({ recent: [] })).toEqual([]);
  });

  it('drops malformed entries individually rather than losing the roster', () => {
    const list = parseRecentList([
      character(),
      { name: 'Broken' },
      character({ name: 'Jaina', realmSlug: 'stormrage' }),
    ]);
    expect(list.map((c) => c.name)).toEqual(['Arthas', 'Jaina']);
  });

  it('drops an entry whose region this build does not recognise', () => {
    expect(parseRecentList([character({ region: 'xx' as never })])).toEqual([]);
  });

  it('defaults className for entries written before the field existed', () => {
    const [entry] = parseRecentList([
      { name: 'Arthas', realmName: 'Illidan', realmSlug: 'illidan', region: 'us' },
    ]);
    expect(entry?.className).toBeNull();
  });

  it('dedupes and caps whatever was on disk', () => {
    const stored = Array.from({ length: MAX_RECENT + 4 }, (_, i) =>
      character({ name: `Char${i}`, realmSlug: `realm-${i}` }),
    );
    expect(parseRecentList([...stored, character({ name: 'Char0', realmSlug: 'realm-0' })])).toHaveLength(
      MAX_RECENT,
    );
  });
});

describe('matchRecent', () => {
  const list = [character(), character({ name: 'Jaina', realmSlug: 'stormrage' })];

  it('returns everything for an empty or whitespace query', () => {
    expect(matchRecent(list, '')).toBe(list);
    expect(matchRecent(list, '   ')).toBe(list);
  });

  it('matches on any part of the name, case-insensitively', () => {
    expect(matchRecent(list, 'THA').map((c) => c.name)).toEqual(['Arthas']);
    expect(matchRecent(list, 'ain').map((c) => c.name)).toEqual(['Jaina']);
  });

  it('is empty when nothing matches', () => {
    expect(matchRecent(list, 'zzz')).toEqual([]);
  });
});
