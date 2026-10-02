/**
 * Every icon in this app, and the one rule about them: **they are
 * decoration, and they are invisible to a screen reader.**
 *
 * `@expo/vector-icons` draws a glyph from an icon font inside a `<Text>`.
 * That Text holds a private-use codepoint with no spoken form, so when it
 * sits inside an element whose description gets merged — a tab, a chip, a
 * card with `accessible` on it — the announcement picks up an empty
 * fragment. Phase 9's `uiautomator` dump caught what that sounds like: the
 * tab bar announced ", Search" and ", Settings", leading comma and all.
 *
 * Every icon here is paired with real text or sits inside a labelled
 * parent, so nothing is lost by hiding them — which is why this is a
 * component rather than a prop to remember at twenty-one call sites. Both
 * platforms have to be told separately, as ever.
 *
 * If an icon ever does carry meaning on its own, it does not belong here:
 * give that one a label on its own accessible wrapper, and say why.
 */
import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export type IconProps = ComponentProps<typeof Ionicons>;
export type IconName = IconProps['name'];

export function Icon(props: IconProps) {
  return (
    <Ionicons
      {...props}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
