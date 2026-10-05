import { describe, expect, it } from 'vitest';
import { foldName, parseSearchResponse, rankSuggestions, type CharacterSuggestion } from './characterSearch';

// Trimmed from a real raider.io/api/search response (2026-10-05).
function character(name: string, region: string, realm: string, className = 'Warrior') {
  return {
    type: 'character',
    name,
    data: {
      id: 1,
      name,
      region: { name: 'Region', slug: region, short_name: region.toUpperCase() },
      realm: { id: 1, name: realm, slug: 'connected-x', altSlug: 'x' },
      class: { id: 1, name: className, slug: className.toLowerCase() },
      thumbnail_url: `//render.worldofwarcraft.com/${region}/character/x/37/1-avatar.jpg?alt=/wow/static/images/2d/avatar/1-1.jpg`,
    },
  };
}

describe('foldName', () => {
  it('strips accents and case', () => {
    expect(foldName('Zòë')).toBe('zoe');
    expect(foldName('João')).toBe('joao');
    expect(foldName('Ãrth')).toBe('arth');
  });
});

describe('parseSearchResponse', () => {
  it('keeps characters only, from regions the app can open', () => {
    const raw = {
      matches: [
        { type: 'realm', name: '(US) Arthas', data: {} },
        { type: 'guild', name: 'Arth', data: {} },
        character('Arth', 'us', 'Proudmoore', 'Paladin'),
        character('Arth', 'cn', 'Loken'),
      ],
    };
    expect(parseSearchResponse(raw)).toEqual([
      {
        name: 'Arth',
        realmName: 'Proudmoore',
        realmSlug: 'proudmoore',
        region: 'us',
        className: 'Paladin',
        avatarUrl: 'https://render.worldofwarcraft.com/us/character/x/37/1-avatar.jpg',
      },
    ]);
  });

  it("derives Blizzard's realm slug from the name, not Raider.IO's", () => {
    const [s] = parseSearchResponse({ matches: [character('Arth', 'eu', "Kael'thas")] });
    expect(s!.realmSlug).toBe('kaelthas');
  });

  it('returns nothing for a changed or broken response shape', () => {
    expect(parseSearchResponse(null)).toEqual([]);
    expect(parseSearchResponse({ results: [] })).toEqual([]);
    expect(parseSearchResponse({ matches: [{ type: 'character', name: 'X' }, 42] })).toEqual([]);
  });
});

describe('rankSuggestions', () => {
  const s = (name: string, region: CharacterSuggestion['region'] = 'us'): CharacterSuggestion => ({
    name,
    region,
    realmName: 'R',
    realmSlug: 'r',
    className: null,
    avatarUrl: null,
  });

  it('puts exact, then prefix, then contains, then loose matches', () => {
    const ranked = rankSuggestions([s('Artha'), s('Darth'), s('Zarthos'), s('Arth'), s('Other')], 'arth');
    expect(ranked.map((r) => r.name)).toEqual(['Arth', 'Artha', 'Darth', 'Zarthos', 'Other']);
  });

  it('matches regardless of accents on either side', () => {
    expect(rankSuggestions([s('Zoey'), s('Zòë')], 'zoe').map((r) => r.name)).toEqual(['Zòë', 'Zoey']);
    expect(rankSuggestions([s('Joaozinho'), s('Joao')], 'joão').map((r) => r.name)).toEqual(['Joao', 'Joaozinho']);
  });

  it('prefers the selected region within a band, keeping source order otherwise', () => {
    const ranked = rankSuggestions([s('Arth', 'eu'), s('Arth', 'us'), s('Arth', 'kr')], 'arth', 'us');
    expect(ranked.map((r) => r.region)).toEqual(['us', 'eu', 'kr']);
  });
});
