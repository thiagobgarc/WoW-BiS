/**
 * A labelled progress bar.
 *
 * mobile-ux.md maps the web's `CompletionMeter` (`role="progressbar"`) to
 * "native progress view + `accessibilityValue`, keep the text percentage",
 * and the same shape is what the stats panel's bars and the raid
 * difficulty bars need. One component, so the accessibility work is done
 * once rather than three times slightly differently.
 *
 * The value is always rendered as text as well as width. A bar alone
 * communicates nothing to a screen reader and little to anyone comparing
 * two near-equal numbers.
 */
import { Text, View } from 'react-native';

interface MeterProps {
  label: string;
  /** 0–1. Values outside are clamped rather than overflowing the track. */
  fraction: number;
  /** The number as the user should read it, e.g. "3/8" or "21.4%". */
  valueText: string;
  /** Announced instead of `label` when the visible label is an abbreviation. */
  accessibilityLabel?: string;
}

export function Meter({ label, fraction, valueText, accessibilityLabel }: MeterProps) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: valueText }}
    >
      <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
        <Text className="flex-1 text-sm text-text-muted">{label}</Text>
        <Text className="text-sm font-semibold text-text">{valueText}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-bg">
        <View className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </View>
    </View>
  );
}
