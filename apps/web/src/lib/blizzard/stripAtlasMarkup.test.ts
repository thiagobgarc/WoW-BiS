import { describe, expect, it } from 'vitest';
import { stripAtlasMarkup } from './domain';

describe('stripAtlasMarkup', () => {
  it('removes the crafting-quality icon tag from an enchant', () => {
    expect(stripAtlasMarkup('Enchanted: Crystalline Radiance |A:Professions-ChatIcon-Quality-Tier3:20:20|a')).toBe(
      'Enchanted: Crystalline Radiance',
    );
  });

  it('leaves plain text and missing text alone', () => {
    expect(stripAtlasMarkup('Enchanted: +20 Stamina')).toBe('Enchanted: +20 Stamina');
    expect(stripAtlasMarkup(undefined)).toBe('');
  });
});
