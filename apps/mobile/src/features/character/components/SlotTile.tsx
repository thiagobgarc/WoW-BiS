/**
 * One slot on the paper doll.
 *
 * The web's tile is a hover target for a tooltip; touch has no hover, so
 * this is a button that opens the slot sheet (mobile-ux.md's `PaperDoll`
 * row). Everything the tooltip held moves into the sheet, and the tile
 * keeps only what is worth scanning sixteen of: slot, icon, name, item
 * level, and the two things that are *actionable* — an empty socket and an
 * empty slot.
 *
 * `min-h-[88px]` rather than a fixed height: the tile has to grow when the
 * OS font size does, and a fixed height is exactly how the two most
 * space-constrained layouts in this app end up clipping text
 * (mobile-ux.md's Dynamic Type note). Phase 9 finished that thought — the
 * name’s two-line clamp lifts at accessibility text sizes, and the grid
 * around this tile drops to one column (see `paperDollColumns`).
 */
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import type { DomainItem, EquipmentSlot } from '@mythos/core/character';
import { slotLabel } from '@mythos/core/utils';

import { slotTileLabel } from '../model/slots';
import { ItemIcon } from './ItemIcon';

interface SlotTileProps {
  slot: EquipmentSlot;
  item: DomainItem | null;
  onPress: () => void;
}

export function SlotTile({ slot, item, onPress }: SlotTileProps) {
  // At ordinary text sizes two lines holds every item name in the game and
  // keeps sixteen tiles scannable. At accessibility sizes it stops being a
  // tidy clamp and starts hiding the name, so above 1.3x the tile is allowed
  // to grow instead — which it can, because its height is a minimum.
  const { fontScale } = useWindowDimensions();
  const emptySockets = item?.sockets.filter((socket) => !socket.filled).length ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slotTileLabel(slot, item)}
      accessibilityHint="Opens the item details"
      onPress={onPress}
      className="min-h-[88px] flex-1 rounded-xl border border-border bg-panel p-3 active:bg-panel-hover"
    >
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
        {slotLabel(slot)}
      </Text>
      <View className="mt-2 flex-row items-center gap-3">
        <ItemIcon iconUrl={item?.iconUrl ?? null} quality={item?.quality ?? null} empty={!item} size={44} />
        <View className="min-w-0 flex-1">
          {item ? (
            <>
              {/* Default text color, never the quality color — see ItemIcon. */}
              <Text
                numberOfLines={fontScale > 1.3 ? undefined : 2}
                className="text-sm font-semibold text-text"
              >
                {item.name}
              </Text>
              <Text className="mt-0.5 text-xs text-text-dim">
                {item.itemLevel}
                {item.isTierPiece ? ' · Tier' : ''}
              </Text>
            </>
          ) : (
            <>
              <Text className="text-sm italic text-text-dim">Empty</Text>
              <Text className="mt-0.5 text-xs text-severity-gap">Needs fill</Text>
            </>
          )}
        </View>
      </View>

      {/* Only the gaps get a chip. A filled socket is the expected state and
          sixteen "Socket: Gem" chips would bury the two that need attention. */}
      {emptySockets > 0 || item?.isEmbellishment ? (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {emptySockets > 0 ? (
            <Text className="rounded bg-severity-close/20 px-1.5 py-0.5 text-[10px] text-severity-close">
              {emptySockets} empty socket{emptySockets === 1 ? '' : 's'}
            </Text>
          ) : null}
          {item?.isEmbellishment ? (
            <Text className="rounded bg-rule px-1.5 py-0.5 text-[10px] text-text-muted">Embellished</Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
