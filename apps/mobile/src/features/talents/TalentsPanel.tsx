/**
 * Talents — the character screen's third tab, and 1.1's, not v1's.
 *
 * `architecture.md` Section 8.10 defers this surface to 1.1, so it ships
 * behind `FEATURES.talents` and the tab does not render until that flips.
 * Building it now is what `src/features.ts` was designed for: "1.1 is a
 * flag flip plus the screen's content — never a navigation restructure."
 *
 * **Diff-first, and diff-only-ish.** `mobile-ux.md`: "Most phone users want
 * the diff, not the tree." So the default segment is the list of
 * differences against the recommended build, and the second segment is the
 * character's own build as a grouped list. The pannable, pinch-zoom tree is
 * out of scope even at 1.1 — that is `mobile-ux.md`'s own call from Phase
 * 1, not a shortcut taken here; see `BuildList` for why a list is the right
 * shape rather than a lesser one.
 *
 * Like the upgrade board, **this fetches nothing.** `talents` and
 * `recommendedTalents` ride in with the character in the one round trip —
 * `api-contract.md` says they ship in v1's response shape specifically so
 * this tab is a client-only addition — so switching segments is two pure
 * derivations over data already on the device.
 */
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CharacterResponse } from '@mythos/api-contract';

import { CollapsibleSection } from '@/components/CollapsibleSection';
import { Meter } from '@/components/Meter';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { colors } from '@/theme';

import { BuildList } from './components/BuildList';
import { OPEN_BY_DEFAULT, TalentDiffList } from './components/TalentDiffList';
import { matchSummaryText } from './model/diffKind';
import { buildGroups, deriveTalentDiff, type TalentDiffKind } from './model/talentDiff';

type TalentView = 'diff' | 'build';

const VIEWS: readonly Segment<TalentView>[] = [
  { id: 'diff', label: 'Differences' },
  { id: 'build', label: 'This build' },
];

const CONTENT_TYPE_LABEL: Record<string, string> = {
  'mythic-plus': 'Mythic+',
  raid: 'Raid',
};

interface TalentsPanelProps {
  talents: CharacterResponse['talents'];
  recommended: CharacterResponse['recommendedTalents'];
}

function Notice({ message }: { message: string }) {
  return (
    <View
      accessible
      accessibilityLabel={message}
      className="flex-row items-start gap-2 rounded-xl border border-border bg-panel p-4"
    >
      <Ionicons name="information-circle-outline" size={16} color={colors['text-muted']} />
      <Text className="flex-1 text-xs leading-5 text-text-muted">{message}</Text>
    </View>
  );
}

export function TalentsPanel({ talents, recommended }: TalentsPanelProps) {
  const [view, setView] = useState<TalentView>('diff');
  const [openKinds, setOpenKinds] = useState<ReadonlySet<TalentDiffKind>>(
    () => new Set(OPEN_BY_DEFAULT),
  );
  const [notesOpen, setNotesOpen] = useState(false);

  const toggleKind = useCallback((kind: TalentDiffKind) => {
    setOpenKinds((open) => {
      const next = new Set(open);
      if (!next.delete(kind)) next.add(kind);
      return next;
    });
  }, []);

  const diff = useMemo(
    () => (talents && recommended ? deriveTalentDiff(talents.tree, talents.current, recommended) : null),
    [talents, recommended],
  );

  const groups = useMemo(
    () =>
      talents
        ? buildGroups(talents.tree, talents.current, talents.heroTree, talents.heroSelections)
        : [],
    [talents],
  );

  // `talents` is nullable by contract for the same reason `progression` is:
  // it is supplementary, and a failure fetching it returns null with the
  // rest of the payload intact rather than failing the whole request.
  if (!talents) {
    return (
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-lg font-bold text-text">
          Talents
        </Text>
        <Notice message="Talents aren't available for this character right now." />
      </View>
    );
  }

  const contentType = recommended ? CONTENT_TYPE_LABEL[recommended.contentType] : null;

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-lg font-bold text-text">
        Talents
      </Text>

      {recommended && diff ? (
        <View className="rounded-xl border border-border bg-panel p-4">
          <Meter
            label={`Against the ${contentType ?? 'recommended'} build`}
            fraction={diff.total > 0 ? diff.matched / diff.total : 0}
            valueText={matchSummaryText(diff.matched, diff.total)}
            accessibilityLabel={`Against the ${contentType ?? 'recommended'} build, ${matchSummaryText(diff.matched, diff.total)}`}
          />
          {/* The hero tree has no recommendation to compare against — the
              seed files do not carry one — so the number above is honestly
              about class and spec picks only, and says so. */}
          <Text className="mt-2 text-xs text-text-dim">
            Class and spec picks only. Hero talents aren&apos;t seeded in the recommended builds
            yet.
          </Text>
        </View>
      ) : null}

      {recommended?.notes ? (
        <CollapsibleSection
          title="Build notes"
          count={1}
          icon="document-text"
          expanded={notesOpen}
          onToggle={() => setNotesOpen((open) => !open)}
        >
          <Text className="text-xs leading-5 text-text-muted">{recommended.notes}</Text>
        </CollapsibleSection>
      ) : null}

      <SegmentedControl segments={VIEWS} active={view} onChange={setView} />

      {view === 'build' ? (
        <BuildList groups={groups} />
      ) : diff ? (
        <TalentDiffList rows={diff.rows} openKinds={openKinds} onToggleKind={toggleKind} />
      ) : (
        <Notice message="No recommended talent build has been seeded for this class and spec yet, so there's nothing to compare against. This character's own build is under “This build”." />
      )}
    </View>
  );
}
