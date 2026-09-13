/**
 * The primary action button.
 *
 * Accent-filled, so it re-themes with `--accent` exactly like the web's
 * `Button` primitive. Disabled state is carried by background *and* text
 * color *and* `accessibilityState`, never by color alone — the same rule
 * mobile-ux.md states for severity chips, applied here so it doesn't become
 * a rule only the severity components follow.
 */
import { Pressable, Text, type PressableProps } from 'react-native';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'accessibilityRole'> {
  label: string;
}

export function Button({ label, disabled, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      className={`min-h-[44px] items-center justify-center rounded-xl px-5 ${
        disabled ? 'bg-panel-hover' : 'bg-accent active:bg-accent-hover'
      }`}
      {...props}
    >
      <Text className={`text-base font-semibold ${disabled ? 'text-text-faint' : 'text-text'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
