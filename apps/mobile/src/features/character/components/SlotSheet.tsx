/**
 * The slot detail sheet — what the web shows in a hover tooltip.
 *
 * Touch has no hover, so mobile-ux.md replaces the `Tooltip` with a bottom
 * sheet: tap a tile, get the full in-game-style item detail, drag it away.
 * A sheet rather than a pushed screen because the paper doll stays visible
 * behind it, and comparing two slots is two taps instead of two navigations.
 *
 * **None of this text is re-derived on device.** `DomainItem` carries the
 * armor line, weapon lines, stat lines, procs and set effects already
 * composed server-side, with their colors — the mapper that builds them
 * stays in `apps/web` (architecture.md Section 1). This component's whole
 * job is ordering them the way the game does: name, item level, binding,
 * slot/armor type, armor, weapon, stats, enchant, sockets, procs, set,
 * requirements.
 *
 * Reduce-motion: opening and closing is a Reanimated animation, which
 * mobile-ux.md says to gate. It is gated by collapsing the duration rather
 * than by rendering something else — same sheet, same gestures, no travel.
 *
 * **`BottomSheet`, not `BottomSheetModal`.** The modal variant portals its
 * content into a hosting container that `BottomSheetModalProvider` renders
 * as its *first* child, before the app tree. On Android, siblings paint in
 * order and that container carries no elevation, so the app's own opaque
 * screen paints straight over the sheet: `present()` resolves, no error is
 * logged, and nothing appears. The non-modal sheet renders where it is
 * written — last inside the character screen — so it paints last, which is
 * the thing that actually has to be true. It also makes the open state a
 * prop instead of an imperative ref, so the screen's `selection` state is
 * the only source of truth.
 */
import { useCallback, useMemo } from 'react';
import { AccessibilityInfo, Linking, Pressable, Text, useWindowDimensions, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import type { DomainItem, EquipmentSlot } from '@mythos/core/character';
import { slotLabel } from '@mythos/core/utils';

import { colors } from '@/theme';
import { setEffectText } from '../model/setEffect';
import { isWowheadUrl } from '../model/externalLinks';
import { ItemIcon } from './ItemIcon';

export interface SlotSelection {
  slot: EquipmentSlot;
  item: DomainItem | null;
}

interface SlotSheetProps {
  selection: SlotSelection | null;
  onClose: () => void;
  /** Injected by the screen so one listener serves every animated surface. */
  reduceMotion: boolean;
}

export function SlotSheet({ selection, onClose, reduceMotion }: SlotSheetProps) {
  const animationConfigs = useBottomSheetTimingConfigs({ duration: reduceMotion ? 1 : 250 });
  const { height } = useWindowDimensions();

  /**
   * Points, not percentages, and measured from the window. A percentage snap
   * point resolves against the library's own container measurement, which is
   * one more thing that can be zero before the first layout; the window's
   * height is known on the first render and cannot be.
   */
  const snapPoints = useMemo(() => [height * 0.6, height * 0.9], [height]);

  /**
   * The stock handle, minus its announcement. Rendering the library's own
   * component keeps the grabber looking exactly as it did — this is an
   * accessibility change, not a visual one.
   */
  const handle = useCallback(
    (props: BottomSheetHandleProps) => (
      <BottomSheetHandle
        {...props}
        indicatorStyle={{ backgroundColor: colors['text-faint'] }}
        accessible={null}
        accessibilityRole={null}
        accessibilityLabel={null}
        accessibilityHint={null}
      />
    ),
    [],
  );

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheet
      // -1 is closed. Driven straight off the screen's state, so there is no
      // imperative open/close call that could disagree with what is rendered.
      index={selection ? 0 : -1}
      snapPoints={snapPoints}
      // v5 defaults dynamic sizing on, and it overrides snapPoints: with a
      // scrollable child it measures a content height of zero and the sheet
      // opens at no height. Snap points and dynamic sizing are alternatives.
      enableDynamicSizing={false}
      // Closed on the first frame, so it must not animate into view at mount.
      animateOnMount={false}
      onClose={onClose}
      enablePanDownToClose
      animationConfigs={animationConfigs}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: colors.panel }}
      // The library announces its own chrome. Phase 9's TalkBack pass heard
      // what that costs: three stops — "Bottom Sheet, adjustable", "Bottom
      // sheet handle", "Bottom Sheet" — before a single word about the item.
      // These props are nullable, unlike RN's, and null opts out rather than
      // falling back to the library's defaults.
      //
      // Measured result: **three stops became one.** The custom handle below
      // accounts for the stop that left; one "Bottom Sheet, adjustable"
      // remains on a container these props do not appear to reach. It is a
      // landmark at the top of an open sheet rather than noise in the middle
      // of it, so it is left alone rather than chased further into the
      // library's internals. Recorded in architecture.md Section 14.
      accessible={null}
      accessibilityRole={null}
      accessibilityLabel={null}
      handleComponent={handle}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {selection ? <SlotSheetBody selection={selection} /> : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

export function SlotSheetBody({ selection: { slot, item } }: { selection: SlotSelection }) {
  if (!item) {
    return (
      <View>
        <Text className="text-lg font-bold text-text">{slotLabel(slot)}</Text>
        <Text className="mt-2 text-sm text-text-muted">Nothing equipped in this slot.</Text>
        <Text className="mt-1 text-sm text-severity-gap">
          An empty slot contributes no stats and no item level — it is the largest upgrade available.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <ItemIcon iconUrl={item.iconUrl} quality={item.quality} size={56} />
        <View className="min-w-0 flex-1">
          {/* Quality lives on the icon border above. See ItemIcon for why. */}
          <Text className="text-lg font-bold text-text">{item.name}</Text>
          <Text className="text-sm text-text-muted">
            {slotLabel(slot)} · Item level {item.itemLevel}
          </Text>
        </View>
      </View>

      <View className="gap-1">
        {item.bindingText ? <Line text={item.bindingText} className="text-text-dim" /> : null}
        {item.armorTypeLabel ? <Line text={item.armorTypeLabel} className="text-text-dim" /> : null}
        {item.armorLine ? <Line text={item.armorLine.text} color={item.armorLine.color} /> : null}
        {item.weaponLines.map((line) => (
          <Line key={line} text={line} className="text-text-dim" />
        ))}
      </View>

      {item.stats.length > 0 ? (
        <View className="gap-1">
          {item.stats.map((stat) => (
            <Line key={stat.text} text={stat.text} color={stat.color} />
          ))}
        </View>
      ) : null}

      {item.enchantText ? <Line text={item.enchantText} className="text-link" /> : null}

      {item.sockets.map((socket, index) => (
        <Line
          // Sockets carry no id and two empty ones are genuinely identical,
          // so position is the only honest key available.
          key={`${index}-${socket.gemName ?? 'empty'}`}
          text={socket.filled ? `Socket: ${socket.gemName ?? 'Gem'}` : 'Empty Socket'}
          className={socket.filled ? 'text-link' : 'text-severity-gap'}
        />
      ))}

      {item.procs.map((proc) => (
        <Line key={proc} text={proc} className="italic text-text-muted" />
      ))}

      {item.setInfo ? (
        <View className="gap-1 border-t border-border pt-3">
          <Text className="text-sm font-semibold text-severity-close">
            {item.setInfo.name}
            {item.setInfo.totalCount > 0
              ? ` (${item.setInfo.ownedCount}/${item.setInfo.totalCount})`
              : ''}
          </Text>
          {item.setInfo.effects.map((effect) => (
            <Text
              key={effect.text}
              className={`text-sm ${effect.active ? 'text-severity-bis' : 'text-text-dim'}`}
            >
              {setEffectText(effect.requiredCount, effect.text)}
              {/* Green says "active" to most people and nothing to the rest. */}
              {effect.active ? ' — active' : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {item.requiredLevelText || item.classesText ? (
        <View className="gap-0.5">
          {item.requiredLevelText ? <Line text={item.requiredLevelText} className="text-text-dim" /> : null}
          {item.classesText ? <Line text={item.classesText} className="text-link" /> : null}
        </View>
      ) : null}

      <WowheadLink url={item.wowheadUrl} itemName={item.name} />
    </View>
  );
}

/**
 * A single tooltip line. Server-composed lines carry their own hex color, so
 * those take `color`; everything else takes a token class. Never both.
 */
function Line({ text, color, className }: { text: string; color?: string; className?: string }) {
  return (
    <Text className={`text-sm ${className ?? 'text-text'}`} style={color ? { color } : undefined}>
      {text}
    </Text>
  );
}

function WowheadLink({ url, itemName }: { url: string; itemName: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`View ${itemName} on Wowhead`}
      accessibilityHint="Opens in your browser"
      onPress={() => {
        // The URL comes from the API, and openURL will launch any scheme —
        // other apps' deep links included — so only ever hand it Wowhead.
        if (!isWowheadUrl(url)) {
          AccessibilityInfo.announceForAccessibility('Could not open Wowhead.');
          return;
        }
        // The system browser, not a WebView: nothing here needs to observe
        // the session, and an in-app browser is a place a login form could
        // appear inside our own chrome.
        Linking.openURL(url).catch(() => {
          AccessibilityInfo.announceForAccessibility('Could not open Wowhead.');
        });
      }}
      className="mt-2 min-h-[44px] justify-center"
    >
      <Text className="text-sm font-semibold text-link">View on Wowhead ↗</Text>
    </Pressable>
  );
}
