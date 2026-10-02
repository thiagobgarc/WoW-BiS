/**
 * Haptic feedback, as a fixed vocabulary rather than an open API.
 *
 * Phase 9 asks for haptics. The risk with them is not technical, it is
 * editorial: a call site can reach for `impactAsync` anywhere, and an app
 * that buzzes on every tap teaches people to ignore the buzz. So this module
 * exports three named *events*, not the underlying primitives, and the rule
 * for adding a fourth is the rule these three were chosen by: **feedback is
 * for a state change the user cannot see coming, or for a selection they
 * made without looking.** Everything with a visible, immediate result — a
 * tile opening a sheet, a link, a text field — gets nothing.
 *
 * That leaves:
 *
 *   - `selection()` — the segmented control. Changing tabs is the one place
 *     a thumb lands on a target it is not looking at, and iOS's own
 *     segmented control does exactly this.
 *   - `refreshSucceeded()` / `refreshFailed()` — pull-to-refresh. The one
 *     action in the app with a delayed and uncertain outcome, and the one
 *     whose result may otherwise be invisible: a refresh that returns the
 *     same gear changes nothing on screen.
 *
 * Two properties worth stating:
 *
 *   - **Every call is fire-and-forget and swallows its error.** Devices
 *     without a taptic engine reject these, and a failed *decoration* must
 *     never surface as a failed action. Nothing here is awaited.
 *   - **The OS setting is the OS's business.** Both platforms suppress
 *     haptics system-wide when the user turns them off, so there is no
 *     in-app toggle and no `AccessibilityInfo` gate to write — unlike
 *     reduce-motion, which RN only reports and does not enforce.
 */
import * as Haptics from 'expo-haptics';

function fire(run: () => Promise<void>): void {
  void run().catch(() => {
    // No taptic engine, or the OS declined. Decoration; never a failure.
  });
}

/** A segment, tab or option changed under the thumb. */
export function selection(): void {
  fire(() => Haptics.selectionAsync());
}

/** A pull-to-refresh came back with fresh data. */
export function refreshSucceeded(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/**
 * A pull-to-refresh failed. `Warning`, not `Error`: the character is still
 * on screen from the snapshot and the banner explains itself — this is a
 * "that didn't take", not a dead end.
 */
export function refreshFailed(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
