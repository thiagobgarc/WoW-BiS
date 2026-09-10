/**
 * A titled panel that can be folded away, with its item count in the
 * header so folding it costs nothing.
 *
 * Phase 7 built it in `features/bis` for the upgrade board's action panels;
 * Phase 8's talent diff needs the identical thing for its four difference
 * groups, so it moved here for the same reason `SegmentedControl` did —
 * Section 6's rule is that two features share a primitive from
 * `components/`, never one feature's component from another feature.
 *
 * `mobile-ux.md` asks for the web's `ActionPanels`/`QuickWinsPanel` as
 * "collapsible sections", and the reason is the axis: the web lays four
 * panels out as a two-column grid that costs one screen, while a phone
 * stacks them below a long list. Collapsed-by-default is what keeps the
 * tail of a screen navigable — and the count in the header is what makes a
 * collapsed section informative rather than merely hidden.
 *
 * No animation on the toggle. Same reasoning as the segmented control:
 * a height animation here would need `LayoutAnimation` or Reanimated, and
 * then need turning off again for reduce-motion, to soften a state change
 * the user just asked for by tapping.
 */
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '@/theme';

interface CollapsibleSectionProps {
  title: string;
  /** Rendered beside the title and announced after it, e.g. "3". */
  count: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  icon,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <View className="overflow-hidden rounded-xl border border-border bg-panel">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${count} ${count === 1 ? 'item' : 'items'}`}
        onPress={onToggle}
        className="min-h-11 flex-row items-center gap-2 p-4"
      >
        <Ionicons name={icon} size={16} color={colors['text-muted']} />
        <Text className="flex-1 text-sm font-bold text-text">{title}</Text>
        <Text className="text-xs font-semibold text-text-dim">{count}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors['text-dim']}
        />
      </Pressable>

      {expanded ? <View className="border-t border-border p-4">{children}</View> : null}
    </View>
  );
}
