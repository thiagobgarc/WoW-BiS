/**
 * A talent's spell icon.
 *
 * Not `ItemIcon`: that one's entire job is the quality-coloured border, and
 * talents have no quality. This is the same `expo-image` disk-cache
 * behaviour — Blizzard media URLs, immutable per spell id, which is most of
 * what makes a re-opened character feel instant offline — with a plain
 * border and a rank badge.
 *
 * Decorative to the accessibility tree in both uses: the talent's name is
 * already the first thing in the row's composed label, and so is its rank.
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

interface TalentIconProps {
  iconUrl: string | null;
  size?: number;
  /** Rendered as a corner badge, for multi-rank talents only. */
  rank?: number;
  /** Dims the icon — used for a talent the character has not taken. */
  dimmed?: boolean;
}

export function TalentIcon({ iconUrl, size = 36, rank, dimmed = false }: TalentIconProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <View
        className={`h-full w-full items-center justify-center overflow-hidden rounded-md border border-border bg-bg ${
          dimmed ? 'opacity-40' : ''
        }`}
      >
        {iconUrl ? (
          <Image
            source={{ uri: iconUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : (
          <Text className="text-xs text-text-dim">?</Text>
        )}
      </View>
      {rank !== undefined ? (
        <View className="absolute -bottom-1 -right-1 min-w-4 items-center justify-center rounded-full border border-bg bg-panel px-1">
          <Text className="text-[10px] font-bold leading-4 text-text">{rank}</Text>
        </View>
      ) : null}
    </View>
  );
}
