/**
 * Builds the GET /v1/character/... payload — one round trip for the whole
 * character screen.
 *
 * This is deliberately the same composition, in the same order, with the
 * same failure handling as src/pages/character/[region]/[realm]/[name].astro:
 * that page is the reference implementation of "what a character screen
 * needs", and the /v1 contract exists to hand a phone the same thing the
 * page renders. If the two ever diverge, the mobile app silently shows
 * something the web app doesn't.
 *
 * The supplementary-vs-core distinction is the page's, kept verbatim: gear
 * and BiS are the screen, so a failure there is a failed request; talents,
 * progression and the meta badge are extra sections, so a failure there is
 * a null field on an otherwise complete response.
 */
import type { CharacterResponse } from '@mythos/api-contract';
import type { CharacterKey } from '@/lib/blizzard/client';
import { getFullCharacter } from '@/lib/blizzard/getFullCharacter';
import { getCharacterProgression } from '@/lib/blizzard/getCharacterProgression';
import { getCharacterTalents } from '@/lib/blizzard/getCharacterTalents';
import { getBisList } from '@/lib/bis/getBisList';
import { findTierForSpec, getMythicPlusTierList } from '@/lib/meta/getTierList';
import { getRecommendedBuild } from '@/lib/talents/getRecommendedBuild';
import { CURRENT_SEASON_ID } from '@/lib/season/seasonConfig';

export async function composeCharacterResponse(key: CharacterKey): Promise<CharacterResponse> {
  const full = await getFullCharacter(key);
  const { character } = full;

  let bis: CharacterResponse['bis'] = { entries: [], seeded: false };
  let recommendedTalents: CharacterResponse['recommendedTalents'] = null;
  let metaTier: CharacterResponse['metaTier'] = null;
  let talents: CharacterResponse['talents'] = null;
  let progression: CharacterResponse['progression'] = null;

  if (character.specName) {
    const list = await getBisList(CURRENT_SEASON_ID, character.className, character.specName);
    bis = {
      entries: list.entries,
      seeded: list.seeded,
      statPriority: list.seeded ? list.statPriority : undefined,
    };

    recommendedTalents = (await getRecommendedBuild(CURRENT_SEASON_ID, character.className, character.specName)).build;

    try {
      const tierList = await getMythicPlusTierList(CURRENT_SEASON_ID);
      metaTier = tierList.list ? findTierForSpec(tierList.list.entries, character.className, character.specName) : null;
    } catch {
      metaTier = null;
    }
  }

  if (character.specId) {
    try {
      talents = await getCharacterTalents(key, character.specId);
    } catch {
      talents = null;
    }
  }

  try {
    const { raid, mythicPlus } = await getCharacterProgression(key);
    progression = { raid, mythicPlus };
  } catch {
    progression = null;
  }

  return {
    character,
    equipment: full.equipment,
    stats: full.stats,
    avatarUrl: full.avatarUrl,
    mock: full.mock,
    fetchedAt: full.fetchedAt,
    stale: full.stale,
    bis,
    talents,
    recommendedTalents,
    progression,
    metaTier,
  };
}
