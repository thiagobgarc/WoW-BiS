/**
 * The one layout primitive the scaffold needs: a full-bleed dark surface
 * that respects the notch. Every screen starts here so no screen has to
 * remember the background color or the safe-area insets.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  /** Tab screens sit above the tab bar, so they skip the bottom inset. */
  edges?: { bottom?: boolean };
}

export function Screen({ children, edges }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-bg px-4"
      style={{ paddingTop: insets.top, paddingBottom: edges?.bottom === false ? 0 : insets.bottom }}
    >
      {children}
    </View>
  );
}
