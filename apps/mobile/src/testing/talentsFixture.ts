/**
 * The talent half of `CHARACTER_FIXTURE`: a small tree, a character's picks
 * in it, and a recommended build to differ from.
 *
 * Authored to the same brief as `bisFixture.ts` — every entry exists to put
 * one branch of `deriveTalentDiff`/`buildGroups` on screen. Between them
 * the three lists produce all four kinds of difference, a structural node
 * with no options, a choice node taken the other way, a multi-rank talent
 * taken at a lower rank, and a recommended pick whose node the tree no
 * longer contains.
 *
 * A real tree is roughly sixty nodes; this one is thirteen. The size is not
 * the interesting variable — the branches are — and a sixty-node fixture
 * would be sixty chances to get an assertion's arithmetic wrong.
 */
import type { CharacterTalents } from '@mythos/api-contract';
import type { DomainTalentNode, RecommendedTalentBuild, TalentSelection } from '@mythos/core/talents';

function node(
  id: number,
  name: string,
  overrides: Partial<DomainTalentNode> = {},
): DomainTalentNode {
  return {
    id,
    type: 'passive',
    row: 1,
    col: 1,
    maxRank: 1,
    prerequisiteIds: [],
    options: [
      {
        talentId: id * 10,
        name,
        spellId: id * 100,
        description: `${name} does something useful.`,
        iconUrl: `https://render.example/talent-${id}.jpg`,
      },
    ],
    ...overrides,
  };
}

function choiceNode(id: number, first: string, second: string): DomainTalentNode {
  return {
    ...node(id, first),
    type: 'choice',
    options: [
      {
        talentId: id * 10,
        name: first,
        spellId: id * 100,
        description: `${first} does something useful.`,
        iconUrl: `https://render.example/talent-${id}a.jpg`,
      },
      {
        talentId: id * 10 + 1,
        name: second,
        spellId: id * 100 + 1,
        description: `${second} does something else.`,
        iconUrl: `https://render.example/talent-${id}b.jpg`,
      },
    ],
  };
}

const CLASS_NODES: DomainTalentNode[] = [
  node(100, 'Icy Talons', { maxRank: 2 }),
  node(101, 'Runic Attenuation'),
  node(102, 'Blinding Sleet'),
  choiceNode(103, "Death's Reach", 'Grip of the Dead'),
  node(104, 'Unholy Ground'),
  // Structural — the top-of-tree spec selector, which the web draws as a
  // plain dot. It has no name, so it can never be a row, and the character
  // below "has" it to prove both derivations skip it rather than crash.
  { ...node(105, 'unused'), options: [] },
];

const SPEC_NODES: DomainTalentNode[] = [
  node(200, "Frostwhelp's Aid"),
  node(201, 'Everfrost', { maxRank: 2 }),
  choiceNode(202, 'Breath of Sindragosa', 'Obliteration'),
  node(203, 'Cold Heart'),
];

const HERO_NODES: DomainTalentNode[] = [
  node(300, "Reaper's Mark"),
  node(301, 'Wave of Souls'),
];

/** Class + spec picks. Hero picks live in `heroSelections`, as on the web. */
const CURRENT: TalentSelection[] = [
  { nodeId: 100, rank: 1, optionIndex: 0 }, // build wants rank 2 → lower-rank
  { nodeId: 101, rank: 1, optionIndex: 0 }, // exact match
  { nodeId: 103, rank: 1, optionIndex: 1 }, // other side of the choice
  { nodeId: 104, rank: 1, optionIndex: 0 }, // not in the build at all
  { nodeId: 105, rank: 1, optionIndex: 0 }, // structural, must be ignored
  { nodeId: 200, rank: 1, optionIndex: 0 },
  { nodeId: 202, rank: 1, optionIndex: 0 },
  { nodeId: 203, rank: 1, optionIndex: 0 },
];

export const TALENTS_FIXTURE: CharacterTalents = {
  tree: {
    classNodes: CLASS_NODES,
    specNodes: SPEC_NODES,
    heroTrees: [{ id: 31, name: 'Deathbringer', nodes: HERO_NODES }],
  },
  current: CURRENT,
  heroTree: { id: 31, name: 'Deathbringer', nodes: HERO_NODES },
  heroSelections: [
    { nodeId: 300, rank: 1, optionIndex: 0 },
    { nodeId: 301, rank: 1, optionIndex: 0 },
  ],
  mock: false,
};

export const RECOMMENDED_TALENTS_FIXTURE: RecommendedTalentBuild = {
  season: 'tww-s2',
  class: 'Death Knight',
  spec: 'Unholy',
  contentType: 'mythic-plus',
  classSelections: [
    { nodeId: 100, rank: 2, optionIndex: 0 },
    { nodeId: 101, rank: 1, optionIndex: 0 },
    { nodeId: 102, rank: 1, optionIndex: 0 },
    { nodeId: 103, rank: 1, optionIndex: 0 },
    // Seeded against a tree that no longer has this node — a stale seed is
    // a real thing that happens across a patch, and the diff has to account
    // for it rather than quietly drop a pick out of its own total.
    { nodeId: 999, rank: 1, optionIndex: 0 },
  ],
  specSelections: [
    { nodeId: 200, rank: 1, optionIndex: 0 },
    { nodeId: 201, rank: 2, optionIndex: 0 },
    { nodeId: 202, rank: 1, optionIndex: 0 },
    { nodeId: 203, rank: 1, optionIndex: 0 },
  ],
  notes: 'Swap Breath of Sindragosa for Obliteration on heavy single-target weeks.',
};

/** The same character, with a loadout Blizzard reports as empty. */
export const NO_LOADOUT_TALENTS: CharacterTalents = {
  ...TALENTS_FIXTURE,
  current: null,
  heroTree: null,
  heroSelections: null,
};
