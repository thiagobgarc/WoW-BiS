import type { TalentNode } from './schemas';

/** Every spell id referenced by a set of talent nodes' tooltips, for a batched icon lookup. */
export function spellIdsOf(nodes: TalentNode[]): number[] {
  return nodes.flatMap((n) => {
    const lastRank = n.ranks[n.ranks.length - 1];
    const tooltips = lastRank?.choice_of_tooltips ?? (lastRank?.tooltip ? [lastRank.tooltip] : []);
    return tooltips.map((t) => t.spell_tooltip?.spell.id).filter((id): id is number => id !== undefined);
  });
}
