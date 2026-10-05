import { describe, expect, it } from 'vitest';
import { characterSlug, foldName, foldedMatchRange, realmSlug } from './realmSlug';

describe('realmSlug', () => {
  it.each([
    ['Area 52', 'area-52'],
    ["Kel'Thuzad", 'kelthuzad'],
    ['Azjol-Nerub', 'azjol-nerub'],
    ['Illidan', 'illidan'],
    ['Stormrage', 'stormrage'],
    ["Mal'Ganis", 'malganis'],
    ['Tichondrius', 'tichondrius'],
    ["Zul'jin", 'zuljin'],
    ['Aerie Peak', 'aerie-peak'],
    ['Bleeding Hollow', 'bleeding-hollow'],
    ['Emerald Dream', 'emerald-dream'],
    ['Confrérie du Thorium', 'confrerie-du-thorium'],
    ['Marécage de Zangar', 'marecage-de-zangar'],
    ['Die ewige Wacht', 'die-ewige-wacht'],
    ['Aggra (Português)', 'aggra-portugues'],
    ['Sanguino', 'sanguino'],
    ['Twisting Nether', 'twisting-nether'],
    ['  Ravencrest  ', 'ravencrest'],
  ])('normalizes %s -> %s', (input, expected) => {
    expect(realmSlug(input)).toBe(expected);
  });
});

describe('characterSlug', () => {
  it('lowercases and trims', () => {
    expect(characterSlug('  Arthas  ')).toBe('arthas');
    expect(characterSlug('THRALL')).toBe('thrall');
  });
});

describe('foldName', () => {
  it('strips accents and case', () => {
    expect(foldName('Zòë')).toBe('zoe');
    expect(foldName('João')).toBe('joao');
    expect(foldName('Ãrth')).toBe('arth');
  });
});

describe('foldedMatchRange', () => {
  it('maps an unaccented query onto the accented name', () => {
    expect(foldedMatchRange('Zòë', 'zoe')).toEqual([0, 3]);
    expect(foldedMatchRange('Darthá', 'tha')).toEqual([3, 6]);
  });

  it('handles a decomposed (NFD) name, where one letter is two code units', () => {
    const nfd = 'Zöe';
    expect(foldedMatchRange(nfd, 'oe')).toEqual([1, 4]);
  });

  it('returns null for no match or an empty query', () => {
    expect(foldedMatchRange('Arthas', 'xyz')).toBeNull();
    expect(foldedMatchRange('Arthas', '  ')).toBeNull();
  });
});
