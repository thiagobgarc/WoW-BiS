/**
 * A row of mutually exclusive segments that swaps the content below it.
 *
 * Phase 6 built this as `CharacterTabs` for Gear | Progression. Phase 7
 * needs the same control for the upgrade board's Raid | Mythic+ | PvP —
 * `mobile-ux.md` calls both a "segmented control" — so it moved here, to
 * `components/`, which Section 6 of `architecture.md` reserves for
 * design-system primitives. Two features importing one primitive is the
 * rule; one feature importing another feature's component is not.
 *
 * A control rather than a navigator, because in both uses everything both
 * segments need is already on the device (`api-contract.md`'s "one round
 * trip") and neither segment has a route, a URL or a back-stack entry of
 * its own. Switching is a `useState` in the screen — no navigation, no
 * remount, and therefore no spinner, which is the property `mobile-ux.md`
 * asks for by name for both of them.
 *
 * `tablist`/`tab` rather than `radiogroup`/`radio`: these select which
 * panel is shown, which is what a tab is. The region picker on the search
 * screen is the radiogroup — it selects a value, and nothing below it
 * changes.
 *
 * It is also the app’s one selection haptic (`lib/haptics.ts`): a thumb
 * changing tabs is the one target in this app people hit without looking at
 * it. Firing it here rather than at the two call sites is the same argument
 * as the accessibility state above — one primitive, one behaviour.
 *
 * There is no transition animation to gate for reduce-motion: the content
 * swaps instantly. That is a decision, not an omission — a 60ms cross-fade
 * between two full screens of text buys nothing and is one more thing to
 * have to turn off.
 */
import { Pressable, Text, View } from 'react-native';

import { selection as selectionHaptic } from '@/lib/haptics';

export interface Segment<Id extends string> {
  id: Id;
  label: string;
  /** Appended to the announced label, e.g. "no BiS list this season". */
  accessibilityHint?: string;
}

interface SegmentedControlProps<Id extends string> {
  segments: readonly Segment<Id>[];
  active: Id;
  onChange: (id: Id) => void;
}

export function SegmentedControl<Id extends string>({
  segments,
  active,
  onChange,
}: SegmentedControlProps<Id>) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row gap-1 rounded-xl border border-border bg-panel p-1"
    >
      {segments.map((segment) => {
        const selected = segment.id === active;
        return (
          <Pressable
            key={segment.id}
            accessibilityRole="tab"
            // `selected` is what VoiceOver reads; `checked` is what TalkBack
            // reads. Both, or half the users hear nothing about which is on.
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={segment.label}
            accessibilityHint={segment.accessibilityHint}
            // Only on an actual change: re-pressing the active segment is a
            // no-op, and a no-op that buzzes is how haptics lose their meaning.
            onPress={() => {
              if (selected) return;
              selectionHaptic();
              onChange(segment.id);
            }}
            className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${
              selected ? 'bg-accent-soft' : ''
            }`}
          >
            <Text className={`text-sm font-semibold ${selected ? 'text-text' : 'text-text-dim'}`}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
