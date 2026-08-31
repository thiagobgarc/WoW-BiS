/**
 * Every Blizzard-facing HTTP call lives here, server-side only. Nothing in
 * this file may be imported from a client component/bundle — it reads
 * BLIZZARD_CLIENT_ID/SECRET indirectly via auth.ts.
 *
 * Caching per the product spec:
 *  - character profile/equipment/statistics: 5 minutes, keyed by region:realm:name
 *  - static item data (name/quality/icon): 7 days, keyed by itemId
 *  - realm index: 30 days
 * A manual refresh bypasses the character cache but is itself rate-limited
 * to once per 60s per character (see `refreshCharacter`).
 */
import { getCache } from '@/lib/cache/cache';
import { getBlizzardAccessToken } from './auth';
import {
  hasBlizzardCredentials,
  MOCK_EQUIPMENT,
  MOCK_MEDIA,
  MOCK_PROFILE,
  MOCK_SPECIALIZATIONS,
  MOCK_STATISTICS,
  MOCK_TALENT_TREE,
} from './mock';
import {
  CharacterEquipmentSchema,
  CharacterMediaSchema,
  CharacterProfileSchema,
  CharacterSpecializationsSchema,
  CharacterStatisticsSchema,
  ItemMediaSchema,
  ItemSchema,
  RealmIndexSchema,
  TalentTreeIndexSchema,
  TalentTreeSchema,
  type CharacterEquipment,
  type CharacterMedia,
  type CharacterProfile,
  type CharacterSpecializations,
  type CharacterStatistics,
  type BlizzardItem,
  type RealmIndex,
  type TalentTree,
} from './schemas';
import {
  BlizzardApiError,
  BlizzardUnavailableError,
  CharacterNotFoundError,
  CharacterPrivateError,
} from './errors';

const TTL_CHARACTER_SECONDS = 5 * 60;
const TTL_ITEM_SECONDS = 7 * 24 * 60 * 60;
const TTL_REALM_INDEX_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_COOLDOWN_SECONDS = 60;

function apiHost(region: string): string {
  return region === 'cn' ? 'https://gateway.battlenet.com.cn' : `https://${region}.api.blizzard.com`;
}

interface FetchOpts {
  namespace: 'profile' | 'static' | 'dynamic';
  region: string;
}

async function blizzardGet<T>(path: string, { namespace, region }: FetchOpts): Promise<T> {
  const token = await getBlizzardAccessToken();
  const url = new URL(`${apiHost(region)}${path}`);
  url.searchParams.set('namespace', `${namespace}-${region}`);
  url.searchParams.set('locale', 'en_US');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    throw new BlizzardApiError('Not found', 404);
  }
  if (res.status === 429 || res.status === 503) {
    throw new BlizzardUnavailableError(res.status);
  }
  if (!res.ok) {
    throw new BlizzardApiError(`Blizzard API error: ${res.status} ${res.statusText}`, res.status);
  }

  return (await res.json()) as T;
}

export interface CharacterKey {
  region: string;
  realmSlug: string;
  name: string;
}

async function cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const cache = getCache();
  const hit = await cache.get<T>(key);
  if (hit) return hit;
  const value = await fetcher();
  await cache.set(key, value, ttlSeconds);
  return value;
}

function charCacheKey(kind: string, { region, realmSlug, name }: CharacterKey): string {
  return `character:${kind}:${region}:${realmSlug}:${name.toLowerCase()}`;
}

function charPath(kind: string, { realmSlug, name }: CharacterKey): string {
  return `/profile/wow/character/${realmSlug}/${name.toLowerCase()}${kind}`;
}

// --- Mock-mode helpers -----------------------------------------------------
// MOCK: stamps the requester's own region/realm/name into the fixture data
// so the whole UI is clickable/testable for any input with zero credentials.
function mockProfile(key: CharacterKey): CharacterProfile {
  return {
    ...MOCK_PROFILE,
    name: capitalize(key.name),
    realm: { ...MOCK_PROFILE.realm, slug: key.realmSlug, name: capitalize(key.realmSlug) },
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Public API --------------------------------------------------------

export async function getCharacterProfile(key: CharacterKey): Promise<{ data: CharacterProfile; mock: boolean }> {
  if (!hasBlizzardCredentials()) {
    return { data: mockProfile(key), mock: true };
  }
  const data = await cached(charCacheKey('profile', key), TTL_CHARACTER_SECONDS, async () => {
    try {
      const raw = await blizzardGet<unknown>(charPath('', key), { namespace: 'profile', region: key.region });
      return CharacterProfileSchema.parse(raw);
    } catch (err) {
      if (err instanceof BlizzardApiError && err.status === 404) {
        throw new CharacterNotFoundError(key.region, key.realmSlug, key.name);
      }
      throw err;
    }
  });
  return { data, mock: false };
}

export async function getCharacterEquipment(key: CharacterKey): Promise<{ data: CharacterEquipment; mock: boolean }> {
  if (!hasBlizzardCredentials()) {
    return { data: MOCK_EQUIPMENT, mock: true };
  }
  const data = await cached(charCacheKey('equipment', key), TTL_CHARACTER_SECONDS, async () => {
    try {
      const raw = await blizzardGet<unknown>(charPath('/equipment', key), {
        namespace: 'profile',
        region: key.region,
      });
      return CharacterEquipmentSchema.parse(raw);
    } catch (err) {
      // A profile that resolves but has no equipment payload is the closest
      // heuristic signal we have for "private/never logged in" — see
      // CharacterPrivateError's doc comment.
      if (err instanceof BlizzardApiError && err.status === 404) {
        throw new CharacterPrivateError(key.region, key.realmSlug, key.name);
      }
      throw err;
    }
  });
  return { data, mock: false };
}

export async function getCharacterMedia(key: CharacterKey): Promise<{ data: CharacterMedia; mock: boolean }> {
  if (!hasBlizzardCredentials()) {
    return { data: MOCK_MEDIA, mock: true };
  }
  const data = await cached(charCacheKey('media', key), TTL_CHARACTER_SECONDS, async () => {
    const raw = await blizzardGet<unknown>(charPath('/character-media', key), {
      namespace: 'profile',
      region: key.region,
    });
    return CharacterMediaSchema.parse(raw);
  });
  return { data, mock: false };
}

export async function getCharacterStatistics(key: CharacterKey): Promise<{ data: CharacterStatistics; mock: boolean }> {
  if (!hasBlizzardCredentials()) {
    return { data: MOCK_STATISTICS, mock: true };
  }
  const data = await cached(charCacheKey('statistics', key), TTL_CHARACTER_SECONDS, async () => {
    const raw = await blizzardGet<unknown>(charPath('/statistics', key), {
      namespace: 'profile',
      region: key.region,
    });
    return CharacterStatisticsSchema.parse(raw);
  });
  return { data, mock: false };
}

export async function getItem(region: string, itemId: number): Promise<BlizzardItem | null> {
  if (!hasBlizzardCredentials()) return null;
  return cached(`item:${region}:${itemId}`, TTL_ITEM_SECONDS, async () => {
    const raw = await blizzardGet<unknown>(`/data/wow/item/${itemId}`, { namespace: 'static', region });
    return ItemSchema.parse(raw);
  });
}

export async function getItemIconUrl(region: string, itemId: number): Promise<string | null> {
  if (!hasBlizzardCredentials()) return null;
  try {
    return await cached(`item-media:${region}:${itemId}`, TTL_ITEM_SECONDS, async () => {
      const raw = await blizzardGet<unknown>(`/data/wow/media/item/${itemId}`, {
        namespace: 'static',
        region,
      });
      const parsed = ItemMediaSchema.parse(raw);
      return parsed.assets.find((a) => a.key === 'icon')?.value ?? null;
    });
  } catch {
    return null; // fall back to placeholder icon on 404/any failure — never block the page on an icon
  }
}

export async function getRealmIndex(region: string): Promise<RealmIndex> {
  return cached(`realm-index:${region}`, TTL_REALM_INDEX_SECONDS, async () => {
    const raw = await blizzardGet<unknown>('/data/wow/realm/index', { namespace: 'dynamic', region });
    return RealmIndexSchema.parse(raw);
  });
}

export async function getCharacterSpecializations(key: CharacterKey): Promise<{ data: CharacterSpecializations; mock: boolean }> {
  if (!hasBlizzardCredentials()) {
    return { data: MOCK_SPECIALIZATIONS, mock: true };
  }
  const data = await cached(charCacheKey('specializations', key), TTL_CHARACTER_SECONDS, async () => {
    const raw = await blizzardGet<unknown>(charPath('/specializations', key), {
      namespace: 'profile',
      region: key.region,
    });
    return CharacterSpecializationsSchema.parse(raw);
  });
  return { data, mock: false };
}

// The talent tree/node graph is static game data — identical for every
// character of a given spec — so it's cached long-term (TTL_ITEM_SECONDS)
// keyed by specId, never per-character, and gated on credentials like the
// rest of static data (getItem, getRealmIndex) even though it's not
// character-specific, to keep the "zero external calls with no creds"
// guarantee intact.
function extractTreeAndSpecId(href: string): { treeId: number; specId: number } | null {
  const match = href.match(/\/talent-tree\/(\d+)\/playable-specialization\/(\d+)/);
  return match ? { treeId: Number(match[1]), specId: Number(match[2]) } : null;
}

async function resolveTreeId(region: string, specId: number): Promise<number> {
  const index = await cached(`talent-tree-index:${region}`, TTL_ITEM_SECONDS, async () => {
    const raw = await blizzardGet<unknown>('/data/wow/talent-tree/index', { namespace: 'static', region });
    return TalentTreeIndexSchema.parse(raw);
  });
  for (const entry of index.spec_talent_trees) {
    const ids = extractTreeAndSpecId(entry.key.href);
    if (ids?.specId === specId) return ids.treeId;
  }
  throw new BlizzardApiError(`No talent tree found for spec ${specId}`, 404);
}

export async function getTalentTree(region: string, specId: number): Promise<{ data: TalentTree; mock: boolean }> {
  if (!hasBlizzardCredentials()) {
    return { data: MOCK_TALENT_TREE, mock: true };
  }
  const data = await cached(`talent-tree:${region}:${specId}`, TTL_ITEM_SECONDS, async () => {
    const treeId = await resolveTreeId(region, specId);
    const raw = await blizzardGet<unknown>(`/data/wow/talent-tree/${treeId}/playable-specialization/${specId}`, {
      namespace: 'static',
      region,
    });
    return TalentTreeSchema.parse(raw);
  });
  return { data, mock: false };
}

export async function getSpellIconUrl(region: string, spellId: number): Promise<string | null> {
  if (!hasBlizzardCredentials()) return null;
  try {
    return await cached(`spell-media:${region}:${spellId}`, TTL_ITEM_SECONDS, async () => {
      const raw = await blizzardGet<unknown>(`/data/wow/media/spell/${spellId}`, { namespace: 'static', region });
      const parsed = ItemMediaSchema.parse(raw); // same { assets: [{ key, value }] } shape as item media
      return parsed.assets.find((a) => a.key === 'icon')?.value ?? null;
    });
  } catch {
    return null; // never block rendering on a single missing icon
  }
}

/** Bypasses the character cache, subject to a 60s per-character cooldown. */
export async function refreshCharacter(key: CharacterKey): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const cache = getCache();
  const cooldownKey = charCacheKey('refresh-cooldown', key);
  const onCooldown = await cache.get<number>(cooldownKey);
  if (onCooldown) {
    return { ok: false, retryAfterSeconds: REFRESH_COOLDOWN_SECONDS };
  }

  await Promise.all([
    cache.del(charCacheKey('profile', key)),
    cache.del(charCacheKey('equipment', key)),
    cache.del(charCacheKey('media', key)),
    cache.del(charCacheKey('statistics', key)),
    cache.del(charCacheKey('specializations', key)),
  ]);
  await cache.set(cooldownKey, Date.now(), REFRESH_COOLDOWN_SECONDS);
  return { ok: true };
}
