/**
 * Character-independent counterpart to getCharacterTalents.ts — the talent
 * tree's node graph is static game data per spec, identical for every
 * character of that spec, so this fetches it without needing a character
 * key at all. Used by the Meta page's per-spec build view.
 */
import { getTalentTree } from './client';
import { mapTalentTree, type DomainTalentTree } from './domain';
import { getSpellIconUrls } from './getIconUrls';
import { spellIdsOf } from './talentSpellIds';

export async function getSpecTalentTree(region: string, specId: number): Promise<{ tree: DomainTalentTree; mock: boolean }> {
  const treeResult = await getTalentTree(region, specId);

  const spellIds = [
    ...new Set([
      ...spellIdsOf(treeResult.data.class_talent_nodes),
      ...spellIdsOf(treeResult.data.spec_talent_nodes),
      ...spellIdsOf((treeResult.data.hero_talent_trees ?? []).flatMap((h) => h.hero_talent_nodes)),
    ]),
  ];
  const iconUrls = await getSpellIconUrls(region, spellIds);

  const tree = mapTalentTree(treeResult.data, iconUrls, specId);
  return { tree, mock: treeResult.mock };
}
