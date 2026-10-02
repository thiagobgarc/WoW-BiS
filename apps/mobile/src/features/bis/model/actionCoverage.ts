/**
 * Which upgrades the action panels cannot route you to.
 *
 * The panels answer "where do I go and get this", and `deriveActionGroups`
 * buckets exactly four of the eight source types to answer it: raid,
 * dungeon, crafted, catalyst. A target sourced from the vault, from PvP,
 * from a world drop or from a profession falls through every branch and
 * produces no group at all — as does a raid source with no boss recorded,
 * or a dungeon source with no dungeon name.
 *
 * Phase 8's device pass caught what that silence costs: a Frost DK looking
 * at Major-gap rows was told, directly underneath them, that "every slot
 * with a target is already best in slot". The panels had no groups, and an
 * empty panel set was being read as an empty *board*. Those are different
 * facts and only one of them was true.
 *
 * So this counts the difference. It is deliberately computed here, in the
 * mobile Application layer, rather than by adding a fifth group to
 * `deriveActionGroups`: that function is shared with the web, which renders
 * the same four panels and has the same gap, and widening a shared core
 * function to fix a sentence on one client is how a polish phase turns into
 * a cross-app behaviour change. What is wrong here is the *claim*, and the
 * claim is mobile's. The core defect stays recorded rather than quietly
 * patched from the side.
 */
import type { ComparisonRow } from '@mythos/core/bis';
import { slotLabel } from '@mythos/core/utils';

/** The source types `deriveActionGroups` turns into a panel. */
const ROUTED = new Set(['raid', 'dungeon', 'crafted', 'catalyst']);

/**
 * Slot labels for rows that want an upgrade whose source no panel covers.
 *
 * It starts from `deriveActionGroups`' own filter — `severity !== 'bis' &&
 * target` — so a row counted here is one that function looked at and
 * dropped, not merely one this file judges differently. It then adds the
 * condition that function has no need of: **a positive ilvl delta.**
 *
 * That second test is not a refinement, it is the difference between true
 * and false. `compareGear` reports a slot whose equipped item *out-levels*
 * the list as 'close' with a negative delta — the seeded fixture has one, a
 * 636 neck against a 630 vault target — and the panels drop such a row
 * entirely correctly, because there is nothing to go and get. Counting it
 * here would trade the old overclaim ("everything is BiS") for a new one
 * ("Neck has an upgrade"), which is not an improvement.
 */
export function unroutedUpgradeSlots(rows: ComparisonRow[]): string[] {
  return rows
    .filter((row) => {
      if (row.severity === 'bis' || !row.target) return false;
      // Nothing to route to when the equipped item is the better one.
      if (row.ilvlDelta <= 0) return false;
      const source = row.target.source;
      if (!ROUTED.has(source.type)) return true;
      // A raid or dungeon source missing the name the panel groups by is
      // dropped just as silently as an unsupported type.
      if (source.type === 'raid') return !source.boss;
      if (source.type === 'dungeon') return !source.dungeon;
      return false;
    })
    .map((row) => slotLabel(row.physicalSlot));
}

/**
 * The sentence naming them. Returns `null` when there is nothing to say,
 * so the caller is a single conditional rather than a length check plus a
 * pluralisation.
 */
export function unroutedMessage(slots: string[]): string | null {
  if (slots.length === 0) return null;
  const list = slots.join(', ');
  return slots.length === 1
    ? `${list} has an upgrade with no farm route — the vault, PvP, world drops and professions aren't grouped here. It's in the rows above.`
    : `${slots.length} upgrades have no farm route — the vault, PvP, world drops and professions aren't grouped here. They're in the rows above: ${list}.`;
}
