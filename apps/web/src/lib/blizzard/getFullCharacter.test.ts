import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlizzardApiError, CharacterNotFoundError } from './errors';

vi.mock('./client', () => ({
  getCharacterProfile: vi.fn(),
  getCharacterEquipment: vi.fn(),
  getCharacterMedia: vi.fn(),
  getCharacterStatistics: vi.fn(),
  getItemIconUrl: vi.fn(),
  getSpellIconUrl: vi.fn(),
}));

const client = await import('./client');
const { getFullCharacter } = await import('./getFullCharacter');
const { __resetCacheForTests } = await import('@/lib/cache/cache');

const key = { region: 'us', realmSlug: 'eredar', name: 'zoe' };

describe('getFullCharacter', () => {
  beforeEach(() => __resetCacheForTests());

  it("reports a missing character as not found even when another call's 404 lands first", async () => {
    // Media rejects immediately; the profile's not-found arrives later.
    vi.mocked(client.getCharacterMedia).mockRejectedValue(new BlizzardApiError('Not found', 404));
    vi.mocked(client.getCharacterStatistics).mockRejectedValue(new BlizzardApiError('Not found', 404));
    vi.mocked(client.getCharacterEquipment).mockRejectedValue(new BlizzardApiError('Not found', 404));
    vi.mocked(client.getCharacterProfile).mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new CharacterNotFoundError('us', 'eredar', 'zoe')), 10)),
    );

    await expect(getFullCharacter(key)).rejects.toBeInstanceOf(CharacterNotFoundError);
  });
});
