import { describe, expect, it } from 'vitest';
import { characterSlug, realmSlug } from './realmSlug';

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
