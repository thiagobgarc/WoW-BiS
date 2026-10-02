import { describe, expect, it } from 'vitest';
import { diffTalents } from './diffTalents';
import type { RecommendedSelection } from './types';

function rec(nodeId: number, optionIndex = 0, rank = 1): RecommendedSelection {
  return { nodeId, rank, optionIndex };
}

describe('diffTalents', () => {
  it('returns zero matches and all-missing when the character has no talents selected', () => {
    const result = diffTalents(null, [rec(1), rec(2)]);
    expect(result).toEqual({ matched: 0, total: 2, missingNodeIds: [1, 2] });
  });

  it('counts a node as matched when its nodeId + optionIndex both match', () => {
    const current = [{ nodeId: 1, rank: 1, optionIndex: 0 }];
    const result = diffTalents(current, [rec(1)]);
    expect(result).toEqual({ matched: 1, total: 1, missingNodeIds: [] });
  });

  it('treats a different CHOICE option on the same node as a miss, not a match', () => {
    const current = [{ nodeId: 1, rank: 1, optionIndex: 0 }];
    const result = diffTalents(current, [rec(1, 1)]);
    expect(result).toEqual({ matched: 0, total: 1, missingNodeIds: [1] });
  });

  it('does not require rank to match, only the node/option pick', () => {
    const current = [{ nodeId: 1, rank: 1, optionIndex: 0 }];
    const result = diffTalents(current, [rec(1, 0, 2)]);
    expect(result).toEqual({ matched: 1, total: 1, missingNodeIds: [] });
  });

  it('reports a partial match across several recommended picks', () => {
    const current = [
      { nodeId: 1, rank: 1, optionIndex: 0 },
      { nodeId: 2, rank: 1, optionIndex: 0 },
    ];
    const result = diffTalents(current, [rec(1), rec(2), rec(3)]);
    expect(result).toEqual({ matched: 2, total: 3, missingNodeIds: [3] });
  });
});
