/**
 * Missing enchants, empty sockets, an un-embellished slot: power the player
 * already owns and has not applied.
 *
 * This sits **above** the comparison rows, which is a deliberate inversion
 * of the web's order. `mobile-ux.md`: "quick wins surface first — highest
 * value, lowest effort, deserves the first screen on a phone." A missing
 * enchant is fixed tonight at an auction house; a rank-1 raid target is
 * fixed in three weeks. On a screen where only one of them is visible at a
 * time, the one you can act on goes first.
 *
 * Expanded by default for the same reason, unlike the action panels below
 * the rows. A section that is both first and folded is just a heading.
 *
 * Two of the three kinds need the season's slot rules from `/v1/meta`
 * (`useMeta`); the socket hints come from the character's own equipment. So
 * an offline first launch still surfaces empty sockets and simply has less
 * to say about enchants — which is why this renders whatever it is given
 * rather than gating on the meta query.
 */
import { Text, View } from 'react-native';
import type { QuickWin } from '@mythos/core/bis';

import { Icon, type IconName } from '@/components/Icon';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { colors } from '@/theme';

const ICON: Record<QuickWin['type'], IconName> = {
  enchant: 'sparkles',
  socket: 'diamond',
  embellishment: 'construct',
};

interface QuickWinsPanelProps {
  quickWins: QuickWin[];
  expanded: boolean;
  onToggle: () => void;
}

export function QuickWinsPanel({ quickWins, expanded, onToggle }: QuickWinsPanelProps) {
  if (quickWins.length === 0) return null;

  return (
    <CollapsibleSection
      title="Quick wins"
      count={quickWins.length}
      icon="flash"
      expanded={expanded}
      onToggle={onToggle}
    >
      <Text className="mb-3 text-xs text-text-dim">
        Free item-level-equivalent power you already have access to.
      </Text>
      <View className="gap-3">
        {quickWins.map((win) => (
          <View
            // `type` + `slot` is unique: deriveActionGroups emits at most one
            // hint of each kind per slot.
            key={`${win.type}-${win.slot}`}
            accessible
            accessibilityLabel={win.label}
            className="flex-row items-start gap-2"
          >
            <Icon name={ICON[win.type]} size={14} color={colors.severity.close} />
            <Text className="flex-1 text-xs leading-5 text-text-muted">{win.label}</Text>
          </View>
        ))}
      </View>
    </CollapsibleSection>
  );
}
