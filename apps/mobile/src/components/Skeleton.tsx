/**
 * Loading placeholders.
 *
 * Phase 9's first item. What was here before was a centered spinner and
 * "Loading Arthas…", which tells you that something is happening but not
 * what is about to arrive, and which moves the whole screen when the real
 * content replaces it. A skeleton that traces the character screen's actual
 * blocks — header, refresh bar, tabs, paper doll, stats — keeps the layout
 * still and makes the wait legible.
 *
 * Three things are deliberate:
 *
 *   - **The pulse is RN's `Animated`, not Reanimated.** Opacity on the
 *     native driver is all this needs, and it keeps the skeleton out of
 *     NativeWind's Reanimated interop — the blocks take `style`, not
 *     `className`, so there is no question about whether a class lands on an
 *     animated component. Layout around them is still className as usual.
 *   - **Reduce motion stops the pulse, it does not hide the skeleton.** The
 *     shape is the information; the animation is decoration. With the
 *     setting on, the blocks render at the midpoint opacity and hold.
 *   - **The whole thing is invisible to a screen reader.** Sixteen grey
 *     rectangles announced one at a time is worse than silence. The
 *     container hides its descendants and carries a single live-region
 *     label instead, so TalkBack and VoiceOver say "Loading Arthas" once.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/lib/useReduceMotion';
import { colors } from '@/theme';

/** The midpoint of the pulse — and the resting value when motion is off. */
const REST_OPACITY = 0.55;
const PULSE_MS = 900;

interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  /** Defaults to a chip-ish 6; pass 999 for circles like the avatar. */
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(REST_OPACITY)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(REST_OPACITY);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: PULSE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: PULSE_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors['panel-hover'], opacity },
        style,
      ]}
    />
  );
}

interface SkeletonScreenProps {
  /** Announced once, e.g. "Loading Arthas". */
  label: string;
  children: ReactNode;
}

/**
 * Wraps a set of blocks as one silent, announced loading region.
 *
 * The outer view is the single accessible element and carries the whole
 * announcement; `busy` is what tells a screen reader this is a wait and not
 * an empty screen. The inner view then hides the blocks themselves, and it
 * has to say so twice because the platforms read different props: iOS takes
 * `accessibilityElementsHidden`, Android takes `importantForAccessibility`.
 * Setting one and not the other is the usual way a skeleton ends up chatty
 * on exactly one platform.
 */
export function SkeletonScreen({ label, children }: SkeletonScreenProps) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
    </View>
  );
}
