import { describe, expect, it } from 'vitest';
import { mapTalentTree } from './domain';
import type { TalentNode, TalentTree } from './schemas';

function node(id: number, col = 1): TalentNode {
  return {
    id,
    node_type: { id: 0, type: 'ACTIVE' },
    ranks: [{ rank: 1, tooltip: { talent: { id: id * 10, name: `Talent ${id}` } } }],
    display_row: 1,
    display_col: col,
  };
}

const HAVOC = 577;
const VENGEANCE = 581;

// The shape Blizzard returns: the spec list repeats the nodes of every hero
// subtree, playable or not, and the class list can carry one too.
const tree: TalentTree = {
  id: 1,
  name: 'Demon Hunter',
  class_talent_nodes: [node(1), node(2), node(201, 30)],
  spec_talent_nodes: [node(10), node(11), node(101), node(102), node(201), node(202)],
  hero_talent_trees: [
    { id: 1, name: 'Playable', hero_talent_nodes: [node(101), node(102)], playable_specializations: [{ id: HAVOC, name: 'Havoc' }] },
    { id: 2, name: 'Other spec', hero_talent_nodes: [node(201), node(202)], playable_specializations: [{ id: VENGEANCE, name: 'Vengeance' }] },
  ],
};

describe('mapTalentTree', () => {
  const mapped = mapTalentTree(tree, new Map(), HAVOC);
  const ids = (nodes: { id: number }[]) => nodes.map((n) => n.id);

  it('keeps only the hero subtrees this spec can pick', () => {
    expect(mapped.heroTrees.map((h) => h.name)).toEqual(['Playable']);
  });

  it("strips every hero subtree's nodes from the spec tree, playable or not", () => {
    expect(ids(mapped.specNodes)).toEqual([10, 11]);
  });

  it('strips hero nodes from the class tree too', () => {
    expect(ids(mapped.classNodes)).toEqual([1, 2]);
  });
});
