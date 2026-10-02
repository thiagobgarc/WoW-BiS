import { canSearch, characterRoute } from './searchForm';

describe('canSearch', () => {
  it('needs both fields', () => {
    expect(canSearch('Arthas', 'Illidan')).toBe(true);
    expect(canSearch('Arthas', '')).toBe(false);
    expect(canSearch('', 'Illidan')).toBe(false);
  });

  it('does not count whitespace as content', () => {
    expect(canSearch('  ', 'Illidan')).toBe(false);
    expect(canSearch('Arthas', '  ')).toBe(false);
  });
});

describe('characterRoute', () => {
  it('slugs the realm the same way the web does', () => {
    expect(characterRoute('us', "Kel'Thuzad", 'Arthas').params).toEqual({
      region: 'us',
      realm: 'kelthuzad',
      name: 'arthas',
    });
  });

  it('handles the accented and spaced realm names that break naive slugging', () => {
    expect(characterRoute('eu', 'Confrérie du Thorium', 'Jaina').params.realm).toBe(
      'confrerie-du-thorium',
    );
    expect(characterRoute('us', 'Area 52', 'Jaina').params.realm).toBe('area-52');
  });

  it('trims and lowercases the character name', () => {
    expect(characterRoute('us', 'Illidan', '  THRALL  ').params.name).toBe('thrall');
  });

  it('targets the typed route, not a hand-built string', () => {
    expect(characterRoute('kr', 'Illidan', 'Arthas').pathname).toBe(
      '/character/[region]/[realm]/[name]',
    );
  });
});
