/**
 * What each kind of difference is called, what it looks like, and what a
 * row of it says out loud.
 *
 * Same split as the upgrade board's `model/severity.ts`, for the same
 * reason: the copy is the part worth testing, and it is the part that
 * quietly goes wrong in JSX. Colour is paired with a distinct glyph and a
 * word here too — `mobile-ux.md`'s never-colour-alone rule is stated for
 * severity chips, and there is no reason a talent chip gets an exemption.
 *
 * Note what the four titles do *not* say. None of them says "wrong". A
 * recommended build is one seeded opinion about one content type, and a
 * player who took the other side of a choice node usually knows why. The
 * screen reports differences; it does not grade them.
 */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '@/theme';

import type { TalentDiffKind, TalentDiffRow } from './talentDiff';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface DiffKindStyle {
  /** The section header. */
  title: string;
  /** One line under the header, explaining what the group means. */
  blurb: string;
  icon: IoniconName;
  color: string;
  text: string;
}

export const DIFF_KIND_STYLE = {
  missing: {
    title: 'Not taken',
    blurb: 'The build takes these and this character does not.',
    icon: 'close-circle',
    color: colors.severity.gap,
    text: 'text-severity-gap',
  },
  'different-choice': {
    title: 'Different choice',
    blurb: 'Same node, other option — often deliberate.',
    icon: 'git-branch',
    color: colors.severity.upgrade,
    text: 'text-severity-upgrade',
  },
  'lower-rank': {
    title: 'Fewer points',
    blurb: 'Taken, but with fewer points than the build puts in.',
    icon: 'remove-circle',
    color: colors.severity.close,
    text: 'text-severity-close',
  },
  extra: {
    title: 'Not in the build',
    blurb: 'Taken here and not in the recommended build — this is what pays for the rest.',
    icon: 'add-circle',
    // Not a severity: neutral, as the web keeps every non-data color.
    color: colors['text-muted'],
    text: 'text-text-muted',
  },
} as const satisfies Record<TalentDiffKind, DiffKindStyle>;

const TREE_LABEL: Record<TalentDiffRow['tree'], string> = {
  class: 'Class',
  spec: 'Spec',
};

/** The second line of a row: the specifics, or nothing when there are none. */
export function diffRowDetail(row: TalentDiffRow): string | null {
  switch (row.kind) {
    case 'missing':
      return row.unknown
        ? 'This build was seeded against an older version of the tree.'
        : null;
    case 'different-choice':
      return row.currentName ? `You took ${row.currentName}` : null;
    case 'lower-rank':
      return `You have ${row.currentRank} of ${row.maxRank ?? row.recommendedRank}; the build takes ${row.recommendedRank}`;
    case 'extra':
      return row.maxRank && row.maxRank > 1 ? `Rank ${row.currentRank} of ${row.maxRank}` : null;
  }
}

/**
 * A row is a name, a tree, and a reason laid out as small text. Swiped one
 * fragment at a time that is a word salad, so — as with the comparison rows
 * — the row is one accessibility element with one sentence.
 */
export function diffRowAccessibilityLabel(row: TalentDiffRow): string {
  const style = DIFF_KIND_STYLE[row.kind];
  const detail = diffRowDetail(row);
  return [`${row.name}.`, `${TREE_LABEL[row.tree]} talent.`, `${style.title}.`, detail]
    .filter(Boolean)
    .join(' ');
}

export function treeLabel(tree: TalentDiffRow['tree']): string {
  return TREE_LABEL[tree];
}

/**
 * The headline over the whole tab.
 *
 * Deliberately not a percentage. "77%" invites a player to optimise a
 * number that is one seeded opinion; "24 of 31 picks" is the same
 * information without the scoreboard, and it is what the web says for the
 * same character.
 */
export function matchSummaryText(matched: number, total: number): string {
  return `${matched} of ${total} picks match`;
}
