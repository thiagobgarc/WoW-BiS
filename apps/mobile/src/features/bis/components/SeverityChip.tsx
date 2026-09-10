/**
 * Colour + glyph + word, never fewer than all three — see `model/severity.ts`
 * for why, and for the table this reads.
 *
 * Decorative to the accessibility tree: the chip's word is already the
 * first thing in the row's composed label, and a second announcement of
 * "Upgrade" between the slot name and the item is noise, not information.
 */
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Severity } from '@mythos/core/bis';

import { SEVERITY_STYLE } from '../model/severity';

export function SeverityChip({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLE[severity];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`flex-row items-center gap-1 rounded-md border px-2 py-1 ${style.chip}`}
    >
      <Ionicons name={style.icon} size={12} color={style.color} />
      <Text className={`text-xs font-semibold ${style.text}`}>{style.label}</Text>
    </View>
  );
}
