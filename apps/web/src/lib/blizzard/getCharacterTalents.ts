/**
 * Composes the calls needed to render a character's current talent build:
 * the character's own selections (Character Specializations API) plus the
 * static node-graph definition for their spec (Trait Tree API), with a
 * batched spell-icon lookup per node option — mirrors getFullCharacter.ts's
 * role for gear. Callers should use this, never the individual client.ts
 * functions directly.
 */
import type { CharacterKey } from './client';
import { getCharacterSpecializations, getSpellIconUrl, getTalentTree } from './client';
import { mapTalentSelections, mapTalentTree, type DomainHeroTree, type DomainTalentTree, type TalentSelection } from './domain';
import { spellIdsOf } from './talentSpellIds';

export interface CharacterTalents {
  tree: DomainTalentTree;
  current: TalentSelection[] | null;
  heroTree: DomainHeroTree | null;
  heroSelections: TalentSelection[] | null;
  mock: boolean;
}

export async function getCharacterTalents(key: CharacterKey, specId: number): Promise<CharacterTalents> {
  const [treeResult, specializationsResult] = await Promise.all([
    getTalentTree(key.region, specId),
    getCharacterSpecializations(key),
  ]);

  const spellIds = [
    ...new Set([
      ...spellIdsOf(treeResult.data.class_talent_nodes),
      ...spellIdsOf(treeResult.data.spec_talent_nodes),
      ...spellIdsOf((treeResult.data.hero_talent_trees ?? []).flatMap((h) => h.hero_talent_nodes)),
    ]),
  ];
  const iconEntries = await Promise.all(spellIds.map(async (id) => [id, await getSpellIconUrl(key.region, id)] as const));
  const iconUrls = new Map(iconEntries.filter((e): e is [number, string] => e[1] !== null));

  const tree = mapTalentTree(treeResult.data, iconUrls, specId);
  const built = mapTalentSelections(specializationsResult.data, specId, tree);

  return {
    tree,
    current: built?.selections ?? null,
    heroTree: built?.heroTree ?? null,
    heroSelections: built && built.heroSelections.length > 0 ? built.heroSelections : null,
    mock: treeResult.mock || specializationsResult.mock,
  };
}
