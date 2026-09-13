/**
 * The paper doll: sixteen slot tiles in a responsive grid.
 *
 * mobile-ux.md: "2 cols portrait, 3–4 landscape/tablet" — the web's two
 * flanking columns around a character render do not survive at 390pt, so
 * this is a grid and the render moves to the header's avatar.
 *
 * Laid out with wrapping flex rows rather than FlashList: the list is
 * exactly sixteen items, it is bounded and always fully scrolled past, and
 * it sits inside the screen's ScrollView where a virtualised list would be
 * nested inside another one for no gain. Same reasoning architecture.md
 * Section 10.10 recorded for the realm suggestions and the roster.
 */
import { useWindowDimensions, View } from 'react-native';
import type { DomainItem, EquipmentBySlot, EquipmentSlot } from '@mythos/core/character';

import { PAPER_DOLL_SLOTS } from '../model/slots';
import { SlotTile } from './SlotTile';

/**
 * Breakpoints in points, not device classes. A large phone in landscape and
 * a small tablet in portrait want the same thing, and asking "how wide is
 * the window" is the only question that gets that right on both.
 *
 * Phase 9 added the second argument. `mobile-ux.md` names the paper doll as
 * one of the two layouts most likely to clip under Dynamic Type, and the
 * tile already grows vertically (`min-h`, never `h`) to absorb it — but two
 * columns of 390pt phone at 200% text leaves each item name about six
 * characters of width, which no amount of vertical growth fixes. Dividing
 * the width by the font scale states the relationship directly: **text
 * twice as large needs the room a screen half as wide would have needed**,
 * so one rule covers large text, small phones and tablets instead of three.
 *
 * The 260 floor is where the fourth tier starts rather than 320, so an
 * ordinary large-text setting (~1.3-1.5x) keeps two columns and only the
 * genuinely large ones (2x and up) collapse to a single column.
 */
export function paperDollColumns(width: number, fontScale = 1): number {
  const effective = width / Math.max(1, fontScale);
  if (effective >= 1000) return 4;
  if (effective >= 640) return 3;
  if (effective >= 260) return 2;
  return 1;
}

interface PaperDollProps {
  equipment: EquipmentBySlot;
  onSelectSlot: (slot: EquipmentSlot, item: DomainItem | null) => void;
}

export function PaperDoll({ equipment, onSelectSlot }: PaperDollProps) {
  const { width, fontScale } = useWindowDimensions();
  const columns = paperDollColumns(width, fontScale);

  return (
    // No flex `gap` here: percentage-width cells plus a gap overflow the row
    // and drop the last tile onto a line of its own. The gutter is padding
    // inside each cell, cancelled at the right edge by the negative margin,
    // which stays exact at any column count.
    <View accessibilityLabel="Equipped gear" className="-mr-2 flex-row flex-wrap">
      {PAPER_DOLL_SLOTS.map((slot) => {
        const item = equipment[slot] ?? null;
        return (
          // The cell carries the column width so the tile itself stays
          // layout-agnostic and can be reused at any size.
          <View key={slot} style={{ width: `${100 / columns}%` }} className="pb-2 pr-2">
            <SlotTile slot={slot} item={item} onPress={() => onSelectSlot(slot, item)} />
          </View>
        );
      })}
    </View>
  );
}
