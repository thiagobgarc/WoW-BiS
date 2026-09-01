/**
 * Composes the calls needed to render a character's Raid Progression and
 * Mythic+ tabs: encounters/raids plus the mythic-keystone-profile index and
 * current-season detail, all scoped down to just this season via
 * seasonConfig — mirrors getCharacterTalents.ts's role for talents.
 * Callers should use this, never the individual client.ts functions
 * directly.
 *
 * Supplementary, like talents: a failure here shouldn't take down the core
 * gear page, so callers are expected to wrap this in their own try/catch
 * (see the character page) rather than this function swallowing errors
 * itself.
 */
import type { CharacterKey } from './client';
import { getCharacterMythicKeystoneProfileIndex, getCharacterMythicKeystoneSeason, getCharacterRaids } from './client';
import { mapMythicPlusProfile, mapRaidProgress, type DomainMythicPlusProfile, type DomainRaidProgress } from './domain';
import { seasonConfig } from '@/lib/season/seasonConfig';

export interface CharacterProgression {
  raid: DomainRaidProgress;
  mythicPlus: DomainMythicPlusProfile;
  mock: boolean;
}

export async function getCharacterProgression(key: CharacterKey): Promise<CharacterProgression> {
  const [raidsResult, mplusIndexResult] = await Promise.all([getCharacterRaids(key), getCharacterMythicKeystoneProfileIndex(key)]);

  const seasonId = seasonConfig.mythicPlus.blizzardSeasonId;
  const hasSeasonData = mplusIndexResult.data.seasons.some((s) => s.id === seasonId);
  const mplusSeasonResult = hasSeasonData
    ? await getCharacterMythicKeystoneSeason(key, seasonId)
    : { data: null, mock: mplusIndexResult.mock };

  const raid = mapRaidProgress(raidsResult.data, seasonConfig.raid.name, seasonConfig.raid.bosses);
  const mythicPlus = mapMythicPlusProfile(mplusIndexResult.data, mplusSeasonResult.data, seasonConfig.mythicPlus.dungeons);

  return {
    raid,
    mythicPlus,
    mock: raidsResult.mock || mplusIndexResult.mock || mplusSeasonResult.mock,
  };
}
