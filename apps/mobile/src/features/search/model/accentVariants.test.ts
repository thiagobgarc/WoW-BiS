import type { CharacterSuggestion } from '@mythos/api-contract';

import { accentVariants } from './accentVariants';

function suggestion(name: string, overrides: Partial<CharacterSuggestion> = {}): CharacterSuggestion {
  return { name, realmName: 'Eredar', realmSlug: 'eredar', region: 'us', className: null, avatarUrl: null, ...overrides };
}

describe('accentVariants', () => {
  const looked = { region: 'us' as const, realm: 'eredar', name: 'zoe' };

  it('keeps accented spellings of the typed name on the same realm', () => {
    const found = accentVariants([suggestion('Zóe'), suggestion('Zoë')], looked);
    expect(found.map((c) => c.name)).toEqual(['Zóe', 'Zoë']);
  });

  it('drops other realms, other regions, and different names', () => {
    const found = accentVariants(
      [
        suggestion('Zóe', { realmSlug: 'stormrage' }),
        suggestion('Zóe', { region: 'eu' }),
        suggestion('Zoey'),
      ],
      looked,
    );
    expect(found).toEqual([]);
  });

  it('drops the exact spelling that was already looked up', () => {
    expect(accentVariants([suggestion('Zoe')], looked)).toEqual([]);
  });
});
