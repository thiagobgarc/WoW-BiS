/**
 * A one-line notice above the content it qualifies.
 *
 * Tone is carried by border, tint *and* an icon — never by color alone,
 * which is the same rule mobile-ux.md states for severity chips. A user who
 * cannot distinguish amber from blue still gets "warning" from the glyph,
 * and a screen reader gets it from `accessibilityLabel`.
 */
import { Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors } from '@/theme';

export type BannerTone = 'info' | 'warning';

const TONES = {
  info: {
    icon: 'information-circle-outline',
    color: colors['text-muted'],
    container: 'border-rule-strong bg-panel',
    prefix: 'Note',
  },
  warning: {
    icon: 'warning-outline',
    color: colors.severity.upgrade,
    container: 'border-severity-upgrade/30 bg-severity-upgrade/10',
    prefix: 'Warning',
  },
} as const satisfies Record<
  BannerTone,
  { icon: IconName; color: string; container: string; prefix: string }
>;

interface BannerProps {
  tone: BannerTone;
  message: string;
}

export function Banner({ tone, message }: BannerProps) {
  const style = TONES[tone];

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${style.prefix}: ${message}`}
      className={`flex-row items-start gap-2 rounded-lg border p-3 ${style.container}`}
    >
      <Icon name={style.icon} size={16} color={style.color} />
      <Text className="flex-1 text-xs leading-5 text-text-muted">{message}</Text>
    </View>
  );
}
