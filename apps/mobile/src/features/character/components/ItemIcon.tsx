/**
 * An item icon in its quality-colored border.
 *
 * The border is the *only* place item quality is expressed, here and in the
 * slot sheet. That is a deliberate carry-over of the web's WCAG rationale
 * (mobile-ux.md, accessibility parity): epic purple and rare blue both fail
 * 4.5:1 as body text on this panel, so item names stay in the default
 * high-contrast color and the color moves to a border, where the 3:1
 * non-text contrast rule applies instead.
 *
 * expo-image rather than RN's Image because these are Blizzard media URLs,
 * immutable per item id, and expo-image caches them on disk across launches
 * — which is most of what makes a re-opened character feel instant offline.
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { qualityColor } from '@mythos/core/utils';

import { colors } from '@/theme';

interface ItemIconProps {
  iconUrl: string | null;
  quality: string | null;
  size?: number;
  empty?: boolean;
}

export function ItemIcon({ iconUrl, quality, size = 48, empty = false }: ItemIconProps) {
  const showPlaceholder = empty || !iconUrl;

  return (
    <View
      // Decorative: everything it conveys is already in the tile's own
      // accessibility label, so it must not be a second stop in the swipe order.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center overflow-hidden rounded-lg border-2 bg-bg"
      style={{ width: size, height: size, borderColor: empty ? colors['text-faint'] : qualityColor(quality) }}
    >
      {showPlaceholder ? (
        <Text className="text-xs text-text-faint">{empty ? '—' : '?'}</Text>
      ) : (
        <Image
          source={{ uri: iconUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          // Icons never change for an item id, so there is no reason to ever
          // re-request one that is already on disk.
          cachePolicy="memory-disk"
          transition={120}
        />
      )}
    </View>
  );
}
