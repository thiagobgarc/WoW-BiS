/**
 * Upgrade board — the answer to "what do I do next", and the reason the
 * rest of the app exists.
 *
 * **Nothing here fetches.** `compareGear` and `deriveActionGroups` are pure
 * functions in `packages/core`, their input (`data.bis`) arrived with the
 * character in the same round trip, and the season's slot rules come from
 * the `/v1/meta` the launch screen already fetched and MMKV already
 * persisted. That is what makes Phase 7's exit criterion — "tab switching
 * is instant and works offline" — a property of the architecture rather
 * than something to optimise afterwards: switching segments recomputes two
 * pure functions over ~40 entries, on device, with the radio off.
 *
 * Order on screen, reading down: the completion meter, the quick wins, the
 * comparison rows, then the action panels. The quick wins are above the
 * rows deliberately — see `QuickWinsPanel` — which is the one place this
 * board's order differs from the web's.
 *
 * **The rows are plain views, not a `FlashList`.** `mobile-ux.md`'s mapping
 * table and the phase plan both say FlashList, and both predate two facts.
 * First, this list is bounded by a compile-time constant: `BIS_SLOTS` is a
 * closed 14-entry union, of which two expand to a pair of physical slots,
 * so `compareGear` cannot return more than sixteen rows for any character
 * or any season. Virtualisation exists for lists whose length is data.
 * Second, the board renders inside the character screen's own `ScrollView`,
 * and a same-axis `FlashList` nested in a `ScrollView` does not virtualise
 * anyway — it renders every row and warns while doing it. The alternative
 * that would virtualise, hoisting the whole Gear tab into one list with the
 * paper doll as a header, restructures a screen Phase 6 shipped in order to
 * window sixteen items. This is the same call Section 10.10 and Section
 * 11.9 of `architecture.md` already recorded for the realm suggestions and
 * the paper doll's tiles, made a third time for the same reason.
 */
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { compareGear, deriveActionGroups, type ContentType } from '@mythos/core/bis';
import type { CharacterBis } from '@mythos/api-contract';
import type { EquipmentBySlot, EquipmentSlot } from '@mythos/core/character';

import { Icon } from '@/components/Icon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { NO_SEASON_SLOTS, useMeta } from '@/features/meta/api/useMeta';
import { colors } from '@/theme';

import { ActionPanels, type ActionPanelId } from './components/ActionPanels';
import { ComparisonRowCard } from './components/ComparisonRowCard';
import { CompletionMeter } from './components/CompletionMeter';
import { QuickWinsPanel } from './components/QuickWinsPanel';
import { contentSegments, defaultContentType, emptyBoardMessage } from './model/contentType';

interface UpgradeBoardProps {
  equipment: EquipmentBySlot;
  bis: CharacterBis;
}

function Notice({ message }: { message: string }) {
  return (
    <View
      accessible
      accessibilityLabel={message}
      className="flex-row items-start gap-2 rounded-xl border border-border bg-panel p-4"
    >
      <Icon name="information-circle-outline" size={16} color={colors['text-muted']} />
      <Text className="flex-1 text-xs leading-5 text-text-muted">{message}</Text>
    </View>
  );
}

export function UpgradeBoard({ equipment, bis }: UpgradeBoardProps) {
  const meta = useMeta();

  /**
   * Opens on the first segment that has entries. A spec seeded only for
   * Mythic+ otherwise opens on an empty Raid board and looks broken.
   * Initial state only: a refresh replaces the entries, and moving the
   * user's segment out from under them mid-read would be worse than a
   * board that is briefly on the segment they chose.
   */
  const [contentType, setContentType] = useState<ContentType>(() =>
    defaultContentType(bis.entries),
  );
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<EquipmentSlot>>(new Set());
  const [quickWinsOpen, setQuickWinsOpen] = useState(true);
  const [openPanels, setOpenPanels] = useState<ReadonlySet<ActionPanelId>>(new Set());

  const result = useMemo(
    () => compareGear(equipment, bis.entries, contentType),
    [equipment, bis.entries, contentType],
  );

  const groups = useMemo(
    () => deriveActionGroups(result.rows, equipment, meta.data?.seasonSlots ?? NO_SEASON_SLOTS),
    [result.rows, equipment, meta.data?.seasonSlots],
  );

  const segments = useMemo(() => contentSegments(bis.entries), [bis.entries]);

  const changeContentType = useCallback((next: ContentType) => {
    setContentType(next);
    // The segments share slot names but not items, so an expanded
    // "3 alternatives" from the raid board would reopen over a different
    // list on the Mythic+ one.
    setExpandedRows(new Set());
  }, []);

  const toggleRow = useCallback((slot: EquipmentSlot) => {
    setExpandedRows((open) => {
      const next = new Set(open);
      if (!next.delete(slot)) next.add(slot);
      return next;
    });
  }, []);

  const togglePanel = useCallback((id: ActionPanelId) => {
    setOpenPanels((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const isPanelExpanded = useCallback((id: ActionPanelId) => openPanels.has(id), [openPanels]);

  // Not an error and not a failure: most specs are unseeded at any given
  // time, and the seed files are the web repo's, not the player's. The web
  // points at its README here, which is not an instruction a phone can act
  // on, so the mobile copy stops at the fact.
  if (!bis.seeded) {
    return (
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-lg font-bold text-text">
          Upgrade board
        </Text>
        <Notice message="No BiS list has been published for this class and spec yet, so there's nothing to compare this character's gear against." />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-lg font-bold text-text">
        Upgrade board
      </Text>

      <SegmentedControl segments={segments} active={contentType} onChange={changeContentType} />

      {result.rows.length === 0 ? (
        <Notice message={emptyBoardMessage(contentType, meta.data?.season.displayName)} />
      ) : (
        <>
          <CompletionMeter contentType={contentType} result={result} />

          <QuickWinsPanel
            quickWins={groups.quickWins}
            expanded={quickWinsOpen}
            onToggle={() => setQuickWinsOpen((open) => !open)}
          />

          <View className="gap-3">
            {result.rows.map((row) => (
              <ComparisonRowCard
                key={row.physicalSlot}
                row={row}
                expanded={expandedRows.has(row.physicalSlot)}
                onToggleAlternatives={toggleRow}
              />
            ))}
          </View>

          <ActionPanels
            groups={groups}
            rows={result.rows}
            isExpanded={isPanelExpanded}
            onToggle={togglePanel}
          />
        </>
      )}
    </View>
  );
}
