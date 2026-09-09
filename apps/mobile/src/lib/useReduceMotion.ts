/**
 * Whether the OS "reduce motion" setting is on, kept live.
 *
 * mobile-ux.md lists `AccessibilityInfo.isReduceMotionEnabled` as a v1
 * accessibility requirement, gating "any tab-switch or bottom-sheet
 * animation". It is a hook rather than a one-off read because the setting
 * can be changed while the app is backgrounded — someone turning it on
 * because motion is making them ill should not have to relaunch.
 *
 * Defaults to `false` (animate) so a platform that never answers behaves
 * like the ordinary case rather than shipping a permanently motion-free app.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
