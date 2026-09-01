/**
 * Composes every Blizzard call needed to render a character page into one
 * function: profile, equipment, media, statistics, and a batched icon-url
 * lookup per equipped item. This is the single entry point routes/pages
 * should call — never call the individual client.ts functions from a page.
 *
 * Also maintains a long-lived "stale" copy of the last successful result
 * per character, independent of the 5-minute live cache. If Blizzard is
 * down (503/429), we fall back to that stale copy with a `stale: true`
 * flag instead of showing an error, per the product spec's
 * "last updated X ago" banner requirement.
 */
import { realmSlug as normalizeRealmSlug, characterSlug } from '@/lib/realmSlug';
import { getCache } from '@/lib/cache/cache';
import { BlizzardUnavailableError } from './errors';
import {
  getCharacterEquipment,
  getCharacterMedia,
  getCharacterProfile,
  getCharacterStatistics,
  getItemIconUrl,
  type CharacterKey,
} from './client';
import { mapEquipment, mapProfile, mapStatistics, type DomainCharacter, type EquipmentBySlot, type SecondaryStats } from './domain';

export interface FullCharacter {
  character: DomainCharacter;
  equipment: EquipmentBySlot;
  stats: SecondaryStats;
  avatarUrl: string | null;
  mock: boolean;
  fetchedAt: number;
  stale: boolean;
}

const STALE_TTL_SECONDS = 7 * 24 * 60 * 60;

export function toCharacterKey(region: string, realmInput: string, nameInput: string): CharacterKey {
  return {
    region: region.toLowerCase(),
    realmSlug: normalizeRealmSlug(realmInput),
    name: characterSlug(nameInput),
  };
}

function staleCacheKey({ region, realmSlug, name }: CharacterKey): string {
  return `character:stale:${region}:${realmSlug}:${name}`;
}

async function fetchFullCharacter(key: CharacterKey): Promise<FullCharacter> {
  const [profileResult, equipmentResult, mediaResult, statsResult] = await Promise.all([
    getCharacterProfile(key),
    getCharacterEquipment(key),
    getCharacterMedia(key),
    getCharacterStatistics(key),
  ]);

  const itemIds = [...new Set(equipmentResult.data.equipped_items.map((i) => i.item.id))];
  const iconEntries = await Promise.all(
    itemIds.map(async (id) => [id, await getItemIconUrl(key.region, id)] as const),
  );
  const iconUrls = new Map(iconEntries.filter((e): e is [number, string] => e[1] !== null));

  const avatarUrl = mediaResult.data.assets.find((a) => a.key === 'avatar')?.value ?? null;

  return {
    character: mapProfile(profileResult.data, key.region),
    equipment: mapEquipment(equipmentResult.data, iconUrls),
    stats: mapStatistics(statsResult.data),
    avatarUrl: avatarUrl || null,
    mock: profileResult.mock || equipmentResult.mock || mediaResult.mock || statsResult.mock,
    fetchedAt: Date.now(),
    stale: false,
  };
}

export async function getFullCharacter(key: CharacterKey): Promise<FullCharacter> {
  const cache = getCache();

  try {
    const full = await fetchFullCharacter(key);
    if (!full.mock) {
      await cache.set(staleCacheKey(key), full, STALE_TTL_SECONDS);
    }
    return full;
  } catch (err) {
    if (err instanceof BlizzardUnavailableError) {
      const stale = await cache.get<FullCharacter>(staleCacheKey(key));
      if (stale) return { ...stale, stale: true };
    }
    throw err;
  }
}
