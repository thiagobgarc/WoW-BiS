/**
 * "How far through this list am I" — the one number the board exists to
 * answer, above the rows that explain it.
 *
 * `mobile-ux.md` maps the web's `CompletionMeter` (`role="progressbar"`) to
 * "native progress view + `accessibilityValue`, keep the text percentage",
 * which is exactly what `components/Meter` already is, so this is the panel
 * around it rather than a second bar implementation.
 *
 * One deliberate divergence from the web: its label is the string
 * "Raid BiS completion" regardless of which tab is showing, which is wrong
 * on two of its three tabs. The label here follows the segment.
 */
import { Text, View } from 'react-native';
import type { CompareGearResult, ContentType } from '@mythos/core/bis';

import { Meter } from '@/components/Meter';

import { contentTypeLabel } from '../model/contentType';

interface CompletionMeterProps {
  contentType: ContentType;
  result: CompareGearResult;
}

export function CompletionMeter({ contentType, result }: CompletionMeterProps) {
  const { bisSlotsCount, totalSlots, currentIlvl, theoreticalMaxIlvl } = result;
  const label = `${contentTypeLabel(contentType)} BiS completion`;

  return (
    <View className="rounded-xl border border-border bg-panel p-4">
      <Meter
        label={label}
        // `totalSlots` is 0 only when the board has already replaced itself
        // with an empty state, but the guard costs one character and a
        // NaN-wide bar is unreadable rather than merely wrong.
        fraction={totalSlots > 0 ? bisSlotsCount / totalSlots : 0}
        valueText={`${bisSlotsCount} of ${totalSlots} slots`}
        accessibilityLabel={`${label}, ${bisSlotsCount} of ${totalSlots} slots`}
      />
      <Text className="mt-2 text-xs text-text-dim">
        Average item level {currentIlvl} · {theoreticalMaxIlvl} with this list fully equipped
      </Text>
    </View>
  );
}
