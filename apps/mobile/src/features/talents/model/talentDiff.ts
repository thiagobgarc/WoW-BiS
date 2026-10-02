/**
 * The talent tab's whole view model: a character's build against the
 * recommended one, as a list a phone can read.
 *
 * This is the Application layer of `architecture.md` Section 2 doing exactly
 * what that section describes — "view-model derivation, composes
 * packages/core functions into screen data". `diffTalents` in
 * `packages/core` stays the authority on *how many* picks match, and this
 * file turns its `missingNodeIds` into rows with names, icons and a reason.
 * It does not live in `packages/core` because nothing but this screen wants
 * it: the web renders trees, not a diff list.
 *
 * Four things a build can differ by, and they are not equally bad, which is
 * why they are separate kinds rather than one "missing" bucket:
 *
 *   - `missing` — the node is not taken at all. The real gap.
 *   - `different-choice` — the node is taken, but the other side of a choice
 *     node. Often deliberate, and the row has to say *what you took*, not
 *     just what you didn't.
 *   - `lower-rank` — taken, right option, fewer points than the build puts
 *     in. `diffTalents` counts this as a match on purpose (its comment: "a
 *     lower rank still counts as picked") and that stays the headline
 *     number, because it is the number the web shows for the same character.
 *     But it is a real, actionable difference, so it is a row.
 *   - `extra` — taken, and the build does not take it. The points that pay
 *     for everything above.
 *
 * **Hero talents are excluded from the diff entirely.** The seed files do
 * not carry hero recommendations (see the scoping note in
 * `packages/core/src/talents/types.ts`), so every hero pick a character has
 * would land in `extra` and bury the real differences under noise. They are
 * listed in the build view instead, where they are information rather than
 * a verdict.
 */
import { diffTalents, type DomainHeroTree, type DomainTalentNode, type DomainTalentTree, type RecommendedSelection, type RecommendedTalentBuild, type TalentSelection } from '@mythos/core/talents';

export type TalentDiffKind = 'missing' | 'different-choice' | 'lower-rank' | 'extra';

export interface TalentDiffRow {
  nodeId: number;
  kind: TalentDiffKind;
  /** Which of the two trees the node sits in, for the row's small label. */
  tree: 'class' | 'spec';
  /** The recommended option's name — or, for `extra`, the taken one. */
  name: string;
  iconUrl: string | null;
  /** What this character took, when that differs and is worth naming. */
  currentName?: string;
  currentRank?: number;
  recommendedRank?: number;
  maxRank?: number;
  /** True when the seed names a node this spec's tree no longer contains. */
  unknown?: boolean;
}

export interface TalentDiffSummary {
  matched: number;
  total: number;
  rows: TalentDiffRow[];
}

export interface BuildTalent {
  nodeId: number;
  name: string;
  iconUrl: string | null;
  rank: number;
  maxRank: number;
  /** Set on a choice node, so the row can say which way it went. */
  choiceOf?: string[];
}

export interface BuildGroup {
  id: 'class' | 'hero' | 'spec';
  title: string;
  talents: BuildTalent[];
}

interface IndexedNode {
  node: DomainTalentNode;
  tree: 'class' | 'spec';
}

function indexTree(tree: DomainTalentTree): Map<number, IndexedNode> {
  const index = new Map<number, IndexedNode>();
  for (const node of tree.classNodes) index.set(node.id, { node, tree: 'class' });
  for (const node of tree.specNodes) index.set(node.id, { node, tree: 'spec' });
  return index;
}

/**
 * A node with no options is structural — the top-of-tree class/spec
 * selector, which the web draws as a plain dot. It has no name, so it can
 * never be a useful row.
 */
function optionAt(node: DomainTalentNode, optionIndex: number) {
  return node.options[optionIndex] ?? node.options[0] ?? null;
}

export function deriveTalentDiff(
  tree: DomainTalentTree,
  current: TalentSelection[] | null,
  recommended: RecommendedTalentBuild,
): TalentDiffSummary {
  const index = indexTree(tree);
  const recommendedSelections: RecommendedSelection[] = [
    ...recommended.classSelections,
    ...recommended.specSelections,
  ];
  const summary = diffTalents(current, recommendedSelections);

  const currentByNode = new Map((current ?? []).map((selection) => [selection.nodeId, selection]));
  const recommendedNodeIds = new Set(recommendedSelections.map((selection) => selection.nodeId));
  const missing = new Set(summary.missingNodeIds);

  const rows: TalentDiffRow[] = [];

  for (const pick of recommendedSelections) {
    const entry = index.get(pick.nodeId);
    const taken = currentByNode.get(pick.nodeId);

    if (!entry) {
      // A seed authored against an older tree. Silently dropping the row
      // would leave the visible list unable to account for the headline
      // "x of y", so it is shown for what it is.
      if (missing.has(pick.nodeId)) {
        rows.push({
          nodeId: pick.nodeId,
          kind: 'missing',
          tree: 'class',
          name: `Unknown talent (node ${pick.nodeId})`,
          iconUrl: null,
          recommendedRank: pick.rank,
          unknown: true,
        });
      }
      continue;
    }

    const { node, tree: which } = entry;
    const wanted = optionAt(node, pick.optionIndex);
    if (!wanted) continue;

    if (missing.has(pick.nodeId)) {
      const takenOption = taken ? optionAt(node, taken.optionIndex) : null;
      rows.push({
        nodeId: pick.nodeId,
        kind: taken ? 'different-choice' : 'missing',
        tree: which,
        name: wanted.name,
        iconUrl: wanted.iconUrl,
        recommendedRank: pick.rank,
        maxRank: node.maxRank,
        ...(taken && takenOption
          ? { currentName: takenOption.name, currentRank: taken.rank }
          : {}),
      });
      continue;
    }

    // Matched by node and option. Rank is the one thing diffTalents does
    // not look at, and a 1/2 where the build puts 2/2 is a real point.
    if (taken && taken.rank < pick.rank) {
      rows.push({
        nodeId: pick.nodeId,
        kind: 'lower-rank',
        tree: which,
        name: wanted.name,
        iconUrl: wanted.iconUrl,
        currentRank: taken.rank,
        recommendedRank: pick.rank,
        maxRank: node.maxRank,
      });
    }
  }

  for (const selection of current ?? []) {
    if (recommendedNodeIds.has(selection.nodeId)) continue;
    const entry = index.get(selection.nodeId);
    if (!entry) continue;
    const option = optionAt(entry.node, selection.optionIndex);
    if (!option) continue;

    rows.push({
      nodeId: selection.nodeId,
      kind: 'extra',
      tree: entry.tree,
      name: option.name,
      iconUrl: option.iconUrl,
      currentRank: selection.rank,
      maxRank: entry.node.maxRank,
    });
  }

  return { matched: summary.matched, total: summary.total, rows };
}

/** Ordered worst-first, which is also the order the screen groups them in. */
export const DIFF_KIND_ORDER: readonly TalentDiffKind[] = [
  'missing',
  'different-choice',
  'lower-rank',
  'extra',
];

export function rowsOfKind(rows: TalentDiffRow[], kind: TalentDiffKind): TalentDiffRow[] {
  return rows.filter((row) => row.kind === kind);
}

function toBuildTalents(
  nodes: DomainTalentNode[],
  selections: TalentSelection[] | null,
): BuildTalent[] {
  const byNode = new Map((selections ?? []).map((selection) => [selection.nodeId, selection]));

  return nodes.flatMap((node) => {
    const selection = byNode.get(node.id);
    if (!selection) return [];
    const option = optionAt(node, selection.optionIndex);
    if (!option) return [];

    return [
      {
        nodeId: node.id,
        name: option.name,
        iconUrl: option.iconUrl,
        rank: selection.rank,
        maxRank: node.maxRank,
        ...(node.options.length > 1
          ? { choiceOf: node.options.map((entry) => entry.name) }
          : {}),
      },
    ];
  });
}

/**
 * What the character has actually taken, grouped the way the three trees
 * are drawn on the web — and in tree order, which is roughly top-to-bottom
 * in the real tree, so a player scanning for a talent looks where they are
 * used to looking.
 *
 * This is the phone's replacement for the pannable tree, not a fallback for
 * it: `mobile-ux.md` puts the tree out of scope even at 1.1, and a list is
 * what the tree was being used to read anyway.
 */
export function buildGroups(
  tree: DomainTalentTree,
  current: TalentSelection[] | null,
  heroTree: DomainHeroTree | null,
  heroSelections: TalentSelection[] | null,
): BuildGroup[] {
  const groups: BuildGroup[] = [
    { id: 'class', title: 'Class talents', talents: toBuildTalents(tree.classNodes, current) },
  ];

  if (heroTree) {
    groups.push({
      id: 'hero',
      title: heroTree.name,
      talents: toBuildTalents(heroTree.nodes, heroSelections),
    });
  }

  groups.push({
    id: 'spec',
    title: 'Spec talents',
    talents: toBuildTalents(tree.specNodes, current),
  });

  return groups.filter((group) => group.talents.length > 0);
}
