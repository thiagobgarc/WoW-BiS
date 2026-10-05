/**
 * Character — pushed from Search or opened from a deep link
 * (`mythos://character/us/illidan/arthas`, or an https link once the web
 * host is configured in app.config.ts).
 *
 * The screen is one request and two tabs. `GET /v1/character/...` returns
 * the character, the equipment, the stats, the BiS seed and the progression
 * in a single payload (api-contract.md's "one round trip"), so **switching
 * tabs never fetches and never spins** — everything either tab needs is
 * already on the device by the time the first one renders.
 *
 * The other property this screen is built around is that a failed request
 * is usually not an error. Anything opened before is restored from the
 * persisted query cache at launch, so airplane mode renders the character
 * with a banner about its age rather than an error page; the error page is
 * reserved for a character this device has never successfully loaded. That
 * split lives in `snapshot.ts` and `errorCopy.ts` respectively, not in the
 * conditionals here.
 *
 * The Gear tab's third block is the upgrade board, which reads `data.bis` —
 * already fetched above, already in this component — through
 * `compareGear`/`deriveActionGroups` from `packages/core`, on device. It
 * fetches nothing, which is why its segments switch with the radio off.
 */
import { MythosApiError } from '@mythos/api-client';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { DomainItem, EquipmentSlot } from '@mythos/core/character';

import { Banner } from '@/components/Banner';
import { Screen } from '@/components/Screen';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { FEATURES } from '@/features';
import { useIsOffline } from '@/lib/onlineStatus';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { UpgradeBoard } from '@/features/bis/UpgradeBoard';
import { TalentsPanel } from '@/features/talents/TalentsPanel';
import { useRememberVisit } from '@/features/roster/useRememberVisit';
import { MythicPlusPanel } from '@/features/progression/components/MythicPlusPanel';
import { RaidProgressionPanel } from '@/features/progression/components/RaidProgressionPanel';
import { accentVars, colors } from '@/theme';
import { parseCharacterParams, useCharacter } from './api/useCharacter';
import { useRefreshCharacter } from './api/useRefreshCharacter';
import { CharacterErrorState } from './components/CharacterErrorState';
import { DidYouMean } from './components/DidYouMean';
import { CharacterHeader } from './components/CharacterHeader';
import { CharacterSkeleton } from './components/CharacterSkeleton';
import { PaperDoll } from './components/PaperDoll';
import { RefreshBar } from './components/RefreshBar';
import { SlotSheet, type SlotSelection } from './components/SlotSheet';
import { StatsPanel } from './components/StatsPanel';
import { characterErrorCopy, unsupportedRegionCopy } from './model/errorCopy';
import { snapshotNotices } from './model/snapshot';

type TabId = 'gear' | 'progression' | 'talents';

/**
 * v1's two tabs, plus 1.1's third.
 *
 * Talents is built (Phase 8) and gated off (`FEATURES.talents`, per Section
 * 8.10), so the array is filtered rather than conditional in the JSX —
 * which is exactly the "a third entry here plus its content, not a
 * restructure" that Section 11.1 promised, now that it has been cashed in.
 * A flag flip is the only change 1.1 needs.
 */
const TABS: readonly Segment<TabId>[] = [
  { id: 'gear', label: 'Gear' },
  { id: 'progression', label: 'Progression' },
  ...(FEATURES.talents ? ([{ id: 'talents', label: 'Talents' }] as const) : []),
];

export default function CharacterScreen() {
  const { region, realm, name } = useLocalSearchParams<{
    region: string;
    realm: string;
    name: string;
  }>();

  const params = parseCharacterParams({ region, realm, name });
  const character = useCharacter(params);
  const refresh = useRefreshCharacter(params);
  const reduceMotion = useReduceMotion();
  const offline = useIsOffline();

  const [tab, setTab] = useState<TabId>('gear');
  const [selection, setSelection] = useState<SlotSelection | null>(null);

  const data = character.data;
  const profile = data?.character;

  // The roster is written here, not at search time, so deep links count and
  // so the stored name is Blizzard's spelling — see useRememberVisit.
  useRememberVisit(profile);

  const selectSlot = useCallback((slot: EquipmentSlot, item: DomainItem | null) => {
    setSelection({ slot, item });
  }, []);

  const closeSheet = useCallback(() => setSelection(null), []);

  return (
    // Re-themes the whole subtree to the character's class color, exactly as
    // the web layout does. Falls back to the brand red until the fetch lands.
    <View style={[{ flex: 1 }, accentVars(profile?.className)]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: profile?.name ?? name ?? 'Character',
          headerStyle: { backgroundColor: colors.panel },
          headerTintColor: colors.text,
        }}
      />
      {/*
        The sheet covers this content but does not, on its own, hide it from
        a screen reader: Phase 9's TalkBack pass swiped straight out of the
        open sheet into the paper doll underneath it, reading sixteen tiles
        that were not on screen. A non-modal `BottomSheet` is the right
        choice here for the painting-order reason recorded in SlotSheet.tsx,
        so the "modal" half of it has to be supplied here.

        **This works on iOS and does not currently work on Android.**
        `accessibilityElementsHidden` is the iOS mechanism and is written
        correctly below. Its Android counterpart,
        `importantForAccessibility="no-hide-descendants"`, had no effect on
        RN 0.86's New Architecture in the Phase 9 pass — verified against a
        `uiautomator` dump with the value hardcoded on, with
        `collapsable={false}` to rule out view flattening, and with RN's
        `aria-hidden` alias. The subtree stayed in the tree in all three.
        The props stay because they are the correct expression of the intent
        and cost nothing; what Android needs instead is either
        `BottomSheetModal` — rejected in Phase 6 for painting order, and
        worth revisiting only with that trade-off reopened — or focus
        management on open. Recorded in architecture.md Section 14 rather
        than left as a prop that silently does nothing.
      */}
      <Screen>
        <View
          style={{ flex: 1 }}
          collapsable={false}
          accessibilityElementsHidden={selection !== null}
          importantForAccessibility={selection !== null ? 'no-hide-descendants' : 'auto'}
        >
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            refreshControl={
              // Pull-to-refresh is disabled outright while the cooldown runs:
              // a gesture that can only produce a 429 should not fire the
              // request at all, and the countdown in RefreshBar says why.
              <RefreshControl
                refreshing={refresh.isRefreshing}
                onRefresh={refresh.refresh}
                enabled={data !== undefined && !refresh.isOnCooldown}
                tintColor={colors['text-muted']}
                colors={[colors['text-muted']]}
                progressBackgroundColor={colors.panel}
              />
            }
          >
            {params === null ? (
              <CharacterErrorState copy={unsupportedRegionCopy(region)} onRetry={() => {}} />
            ) : null}

            {params !== null && character.isPending ? <CharacterSkeleton name={name} /> : null}

            {/* An error only takes the screen when there is no snapshot behind
                it. With one, it is a banner and the character still renders. */}
            {params !== null && character.isError && data === undefined ? (
              <>
                <CharacterErrorState
                  copy={characterErrorCopy(character.error)}
                  onRetry={() => {
                    void character.refetch();
                  }}
                />
                {character.error instanceof MythosApiError && character.error.code === 'character_not_found' ? (
                  <DidYouMean looked={params} />
                ) : null}
              </>
            ) : null}

            {data && profile ? (
              <View className="gap-4 pb-8 pt-2">
                {snapshotNotices({
                  mock: data.mock,
                  stale: data.stale,
                  fetchedAt: data.fetchedAt,
                  // Either path can be the one that failed: the background
                  // revalidation, or the refresh the user asked for.
                  error: character.isError ? character.error : refresh.error,
                  offline,
                }).map((notice) => (
                  <Banner key={notice.id} tone={notice.tone} message={notice.message} />
                ))}

                <CharacterHeader
                  character={profile}
                  equipment={data.equipment}
                  avatarUrl={data.avatarUrl}
                />

                <RefreshBar fetchedAt={data.fetchedAt} refresh={refresh} />

                <SegmentedControl segments={TABS} active={tab} onChange={setTab} />

                {tab === 'gear' ? (
                  <View className="gap-4">
                    <PaperDoll equipment={data.equipment} onSelectSlot={selectSlot} />
                    <StatsPanel stats={data.stats} priority={data.bis.statPriority} />
                    <UpgradeBoard equipment={data.equipment} bis={data.bis} />
                  </View>
                ) : null}

                {tab === 'progression' ? (
                  <View className="gap-4">
                    {data.progression ? (
                      <>
                        <RaidProgressionPanel progress={data.progression.raid} />
                        <MythicPlusPanel profile={data.progression.mythicPlus} />
                      </>
                    ) : (
                      // `progression` is nullable by contract: it is
                      // supplementary, so a failure fetching it returns null
                      // with the rest of the payload intact rather than
                      // failing the request. A normal state, not an error.
                      <View className="rounded-xl border border-border bg-panel p-4">
                        <Text className="text-sm text-text-dim">
                          Raid and Mythic+ progress aren&apos;t available for this character right now.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* 1.1, behind FEATURES.talents — the tab it belongs to is not
                    in TABS until that flips, so this branch is unreachable in
                    v1 rather than merely unrendered. */}
                {tab === 'talents' ? (
                  <TalentsPanel talents={data.talents} recommended={data.recommendedTalents} />
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Screen>

      <SlotSheet selection={selection} onClose={closeSheet} reduceMotion={reduceMotion} />
    </View>
  );
}
