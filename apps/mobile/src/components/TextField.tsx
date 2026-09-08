/**
 * A labelled text input.
 *
 * Exists so the two search fields can't drift apart, and so the two rules
 * that are easy to lose live in one place: a visible label that is also the
 * accessibility label (mobile-ux.md's accessibility parity section — the web
 * has real `<label>`s, a placeholder is not a substitute), and a 44pt
 * minimum height.
 */
import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  label: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, ...props },
  ref,
) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-faint">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors['text-faint']}
        className="min-h-11 rounded-xl border border-border bg-panel px-4 py-2 text-base text-text"
        {...props}
      />
    </View>
  );
});
