/**
 * Mythic+ rating and the season's best run per dungeon.
 *
 * mobile-ux.md: "current M+ rating + per-dungeon best-run cards (level,
 * timed y/n, score, duration). A dungeon with `run: null` renders as an
 * empty card, not omitted — matches the web's 'always show the full dungeon
 * list' behavior."
 *
 * The web renders a six-column table. A table does not survive 390pt, so
 * each dungeon becomes a card: name and keystone level on one line, the
 * rest underneath. Every dungeon in the season is present whether or not it
 * has a run, because "which ones am I missing" is the question this screen
 * exists to answer.
 */
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { DomainDungeonProgress, DomainMythicPlusProfile } from '@mythos/core/progression';
import { timeAgo } from '@mythos/core/utils';

import { colors } from '@/theme';
import { formatRunDuration, formatScore, runSummaryLabel } from '../model/runFormat';

interface MythicPlusPanelProps {
  profile: DomainMythicPlusProfile;
}

export function MythicPlusPanel({ profile }: MythicPlusPanelProps) {
  return (
    <View className="gap-3">
      <View
        accessible
        accessibilityLabel={
          profile.rating === null
            ? 'Mythic Plus score: none this season'
            : `Mythic Plus score: ${formatScore(profile.rating)}`
        }
        className="flex-row items-center justify-between rounded-xl border border-border bg-panel p-4"
      >
        <Text accessibilityRole="header" className="text-lg font-bold text-text">
          Mythic+ score
        </Text>
        <Text className="text-lg font-bold text-link">{formatScore(profile.rating)}</Text>
      </View>

      {profile.dungeons.length === 0 ? (
        <View className="rounded-xl border border-border bg-panel p-4">
          <Text className="text-sm text-text-dim">
            No dungeons are listed for this season yet.
          </Text>
        </View>
      ) : (
        profile.dungeons.map((dungeon) => <DungeonCard key={dungeon.dungeon} progress={dungeon} />)
      )}
    </View>
  );
}

function DungeonCard({ progress: { dungeon, run } }: { progress: DomainDungeonProgress }) {
  return (
    <View
      accessible
      accessibilityLabel={runSummaryLabel(dungeon, run)}
      className="rounded-xl border border-border bg-panel p-4"
    >
      <View className="flex-row items-center gap-2">
        <Text className="min-w-0 flex-1 text-sm font-semibold text-text">{dungeon}</Text>
        {run ? (
          <Text className="rounded bg-link/20 px-2 py-0.5 text-sm font-semibold text-link">
            +{run.level}
          </Text>
        ) : null}
      </View>

      {run ? (
        <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={run.timed ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={run.timed ? colors.severity.bis : colors.severity.gap}
            />
            {/* The word, not just the glyph — the icon carries color and the
                color carries the meaning, which is exactly the pairing
                mobile-ux.md says never to ship on its own. */}
            <Text className="text-xs text-text-muted">{run.timed ? 'Timed' : 'Depleted'}</Text>
          </View>
          <Text className="text-xs text-text-muted">Score {formatScore(run.score)}</Text>
          <Text className="text-xs text-text-muted">{formatRunDuration(run.durationMs)}</Text>
          <Text className="text-xs text-text-dim">{timeAgo(run.completedAt)}</Text>
        </View>
      ) : (
        <Text className="mt-1 text-xs text-text-dim">Not run this season</Text>
      )}
    </View>
  );
}
