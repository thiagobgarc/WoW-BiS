/**
 * One slot: what is in it, what should be, and how far apart those are.
 *
 * The web lays this out as three columns — equipped, delta, target — which
 * is the one thing that cannot survive the port: at phone width three
 * columns give each item about eleven characters of name. So the mobile row
 * stacks, with the delta as a labelled divider between the two items rather
 * than a column beside them. The reading order is the same; only the axis
 * changed.
 *
 * The target item renders with no icon. The BiS list is authored data —
 * `BisEntry` carries an item id and a name, and nothing has resolved that
 * id against Blizzard's media endpoint — so there is no icon URL to show
 * and a generic placeholder beside a real equipped icon would read as "this
 * item has no icon" rather than "we didn't fetch one". The rank badge takes
 * that space instead, which is the information the slot actually adds.
 */
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ComparisonRow, Target } from '@mythos/core/bis';
import type { EquipmentSlot } from '@mythos/core/character';
import { slotLabel, sourceLabel } from '@mythos/core/utils';

import { Icon } from '@/components/Icon';
import { ItemIcon } from '@/features/character/components/ItemIcon';
import { colors } from '@/theme';

import { chipSeverity, deltaLabel, rowAccessibilityLabel, SEVERITY_STYLE } from '../model/severity';
import { SeverityChip } from './SeverityChip';

interface ComparisonRowCardProps {
  row: ComparisonRow;
  expanded: boolean;
  /**
   * Takes the row's physical slot — unique across a compareGear result,
   * since a dual-slot category expands to finger_1/finger_2 — so the board
   * can hand every row the *same* callback identity and the memo below
   * actually holds. An inline arrow per row would defeat it entirely.
   */
  onToggleAlternatives: (physicalSlot: EquipmentSlot) => void;
}

function TargetLine({ target }: { target: Target }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-accent/40 bg-accent-softer px-2">
        <Text className="text-[10px] uppercase tracking-wide text-text-dim">Rank</Text>
        <Text className="text-sm font-bold text-text">{target.rank}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">{target.itemName}</Text>
        <Text className="mt-0.5 text-xs text-text-dim">{target.itemLevel} · Target</Text>
        <Text className="mt-0.5 text-xs text-text-dim">{sourceLabel(target.source)}</Text>
      </View>
    </View>
  );
}

function ComparisonRowCardImpl({ row, expanded, onToggleAlternatives }: ComparisonRowCardProps) {
  const style = SEVERITY_STYLE[row.severity];
  // null for a slot with no seeded target — see chipSeverity.
  const chip = chipSeverity(row);
  const alternatives = row.alternatives.length;

  return (
    <View className="rounded-xl border border-border bg-panel p-4">
      {/* The comparison is one accessibility element with one composed
          sentence — see rowAccessibilityLabel. Swiping through eleven
          fragments of a grid tells a screen-reader user nothing. */}
      <View accessible accessibilityLabel={rowAccessibilityLabel(row)}>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {slotLabel(row.physicalSlot)}
          </Text>
          {chip ? <SeverityChip severity={chip} /> : null}
        </View>

        <View className="mt-3 flex-row items-center gap-3">
          <ItemIcon
            iconUrl={row.equipped?.iconUrl ?? null}
            quality={row.equipped?.quality ?? null}
            size={44}
            empty={!row.equipped}
          />
          <View className="flex-1">
            {/* Quality lives on the icon's border and nowhere else — epic
                purple fails 4.5:1 as body text on this panel. */}
            <Text className="text-sm font-semibold text-text">
              {row.equipped?.name ?? 'Nothing equipped'}
            </Text>
            <Text className="mt-0.5 text-xs text-text-dim">
              {row.equipped ? `${row.equipped.itemLevel} · Equipped` : 'Empty slot'}
            </Text>
          </View>
        </View>

        {row.target && row.severity !== 'bis' ? (
          <>
            <View className="my-3 flex-row items-center gap-2">
              <View className="h-px flex-1 bg-border" />
              <Icon name={style.icon} size={14} color={style.color} />
              <Text className={`text-xs font-bold ${style.text}`}>{deltaLabel(row)}</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            <TargetLine target={row.target} />
          </>
        ) : (
          <Text className="mt-3 text-xs text-text-dim">
            {row.isMatch
              ? 'This is the BiS item for this slot.'
              : 'No BiS target for this slot this season.'}
          </Text>
        )}
      </View>

      {alternatives > 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={`${alternatives} alternative${alternatives > 1 ? 's' : ''} for ${slotLabel(row.physicalSlot)}`}
            onPress={() => onToggleAlternatives(row.physicalSlot)}
            className="mt-3 min-h-[44px] flex-row items-center gap-1 border-t border-border pt-3"
          >
            <Icon
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={colors['text-muted']}
            />
            <Text className="text-xs font-semibold text-text-muted">
              {alternatives} alternative{alternatives > 1 ? 's' : ''}
            </Text>
          </Pressable>

          {expanded ? (
            <View className="mt-1 gap-2">
              {row.alternatives.map((alternative) => (
                <View
                  key={alternative.itemId}
                  accessible
                  accessibilityLabel={`Rank ${alternative.rank}: ${alternative.itemName}, item level ${alternative.itemLevel}, from ${sourceLabel(alternative.source)}`}
                >
                  <Text className="text-xs text-text-muted">
                    Rank {alternative.rank}: {alternative.itemName} ({alternative.itemLevel})
                  </Text>
                  <Text className="text-xs text-text-dim">{sourceLabel(alternative.source)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/**
 * Memoised because the board re-renders on every alternatives toggle — one
 * `Set` in the board, sixteen rows below it — and fifteen of the sixteen
 * have nothing to redo. `row` is a stable object from a memoised
 * `compareGear` call, so the default shallow compare is the right one.
 */
export const ComparisonRowCard = memo(ComparisonRowCardImpl);
