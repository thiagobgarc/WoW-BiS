/**
 * How a comparison row presents itself: its chip, its headline number, and
 * the sentence a screen reader gets instead of the layout.
 *
 * Pure, so the copy is testable without rendering anything — the same split
 * Phase 6 used for `snapshot.ts` and `errorCopy.ts`. Everything a component
 * would otherwise decide inline in JSX (which label, which glyph, whether
 * the delta reads "+12 iLvl" or "Fill now") is decided here.
 *
 * **Colorblind-safe by construction, and that is a requirement, not a
 * polish item.** `mobile-ux.md` states it for these chips by name: a
 * severity is a color *and* a distinct glyph *and* a text label, never one
 * of the three. The four glyphs below are deliberately different shapes —
 * not the same circle in four fills — because "outline vs. filled" is
 * exactly the distinction that disappears at a glance on a phone.
 */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComparisonRow, Severity } from '@mythos/core/bis';
import { slotLabel, sourceLabel } from '@mythos/core/utils';

import { colors } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface SeverityStyle {
  label: string;
  icon: IoniconName;
  /** For the handful of RN APIs that take a color, not a className. */
  color: string;
  /** Chip container classes — tinted background, matching border. */
  chip: string;
  text: string;
}

export const SEVERITY_STYLE = {
  bis: {
    label: 'BiS',
    icon: 'checkmark-circle',
    color: colors.severity.bis,
    chip: 'border-severity-bis/30 bg-severity-bis/15',
    text: 'text-severity-bis',
  },
  close: {
    label: 'Close',
    icon: 'ellipsis-horizontal-circle',
    color: colors.severity.close,
    chip: 'border-severity-close/30 bg-severity-close/15',
    text: 'text-severity-close',
  },
  upgrade: {
    label: 'Upgrade',
    icon: 'arrow-up-circle',
    color: colors.severity.upgrade,
    chip: 'border-severity-upgrade/30 bg-severity-upgrade/15',
    text: 'text-severity-upgrade',
  },
  'major-gap': {
    label: 'Major gap',
    icon: 'alert-circle',
    color: colors.severity.gap,
    chip: 'border-severity-gap/30 bg-severity-gap/15',
    text: 'text-severity-gap',
  },
} as const satisfies Record<Severity, SeverityStyle>;

/**
 * The row's headline: the one number worth reading before anything else.
 *
 * `compareGear` reports a *negative* delta as 'close' — the equipped item
 * out-levels the target, which happens constantly with a Great Vault drop —
 * so a naive `+${delta}` would print "+-4 iLvl". Those rows say what is
 * actually true instead: you are not below the target.
 */
export function deltaLabel(row: ComparisonRow): string {
  if (row.isMatch) return 'Match';
  if (!row.target) return 'No target';
  if (!row.equipped) return 'Fill now';
  if (row.ilvlDelta <= 0) return 'At or above';
  return `+${row.ilvlDelta} iLvl`;
}

/**
 * Which severity the row's chip should claim — or `null` for no chip.
 *
 * `severityFor` returns `bis` for a row with no target at all, the same
 * value it returns for an exact match (Section 12.10). The body copy
 * already distinguishes the two, but the *chip* did not: a slot with no
 * seeded target rendered a green "✓ BiS" badge directly above the sentence
 * "No BiS target for this slot this season", which is a flat
 * contradiction. Found by looking at the board on a device — the fixtures
 * asserted the body text and never the chip.
 *
 * A slot with nothing to compare against gets no chip, because there is no
 * verdict to give.
 */
export function chipSeverity(row: ComparisonRow): Severity | null {
  return row.target ? row.severity : null;
}

/**
 * The whole row as one sentence.
 *
 * The row renders as a grid of small labels, which is the wrong shape to
 * swipe through one fragment at a time: "Head", "636", "Equipped", "648",
 * "BiS Rank 1" tells a screen-reader user nothing about which is which. So
 * the visual row is one accessibility element with this as its label, and
 * the alternatives disclosure below it is the only separate stop.
 */
export function rowAccessibilityLabel(row: ComparisonRow): string {
  // Same trap as the chip: announcing "BiS" before "no BiS target" is
  // worse than saying nothing, so the verdict clause is dropped with it.
  const chip = chipSeverity(row);
  const parts = [
    chip ? `${slotLabel(row.physicalSlot)}. ${SEVERITY_STYLE[chip].label}.` : `${slotLabel(row.physicalSlot)}.`,
  ];

  parts.push(
    row.equipped
      ? `Equipped: ${row.equipped.name}, item level ${row.equipped.itemLevel}.`
      : 'Nothing equipped.',
  );

  if (!row.target) {
    parts.push('No BiS target for this slot this season.');
  } else if (row.isMatch) {
    parts.push('This is the BiS item.');
  } else {
    parts.push(
      `Target: ${row.target.itemName}, item level ${row.target.itemLevel}, BiS rank ${row.target.rank}, from ${sourceLabel(row.target.source)}. ${deltaLabel(row)}.`,
    );
  }

  return parts.join(' ');
}
