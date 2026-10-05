/**
 * Raid progression: a per-difficulty boss checklist.
 *
 * mobile-ux.md: "per-difficulty boss checklist (LFR/Normal/Heroic/Mythic),
 * boss name + killed/total + last-kill relative time. Renders even when
 * all-empty — 'no kills yet this tier' is a real, common state, not an
 * error."
 *
 * The web puts all four difficulties side by side. On a phone they stack,
 * and each one collapses: opening the app in week one of a tier means four
 * identical empty lists, and the useful thing to see first is which
 * difficulties have anything in them at all. The one with progress opens by
 * default for the same reason.
 *
 * A killed boss is a check glyph *and* a text label in the row's
 * accessibility name — never the glyph alone, and never color alone.
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DomainRaidDifficultyProgress, DomainRaidProgress } from '@mythos/core/progression';
import { timeAgo } from '@mythos/core/utils';

import { Icon } from '@/components/Icon';
import { Meter } from '@/components/Meter';
import { colors } from '@/theme';

interface RaidProgressionPanelProps {
  progress: DomainRaidProgress;
}

/**
 * The hardest difficulty with a kill, so the section a player cares about is
 * the one already open. Falls back to the first difficulty (Raid Finder) so
 * a character with no kills at all still shows a boss list rather than four
 * closed rows.
 */
export function defaultOpenDifficulty(progress: DomainRaidProgress): string | null {
  const withKills = progress.difficulties.filter((difficulty) => difficulty.killed > 0);
  const hardest = withKills[withKills.length - 1];
  return hardest?.difficulty ?? progress.difficulties[0]?.difficulty ?? null;
}

export function RaidProgressionPanel({ progress }: RaidProgressionPanelProps) {
  const [open, setOpen] = useState(() => defaultOpenDifficulty(progress));

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-lg font-bold text-text">
        {progress.instanceName}
      </Text>
      {progress.difficulties.map((difficulty) => (
        <DifficultySection
          key={difficulty.difficulty}
          difficulty={difficulty}
          expanded={open === difficulty.difficulty}
          onToggle={() => setOpen(open === difficulty.difficulty ? null : difficulty.difficulty)}
        />
      ))}
    </View>
  );
}

function DifficultySection({
  difficulty,
  expanded,
  onToggle,
}: {
  difficulty: DomainRaidDifficultyProgress;
  expanded: boolean;
  onToggle: () => void;
}) {
  const summary = `${difficulty.killed}/${difficulty.total} defeated`;

  return (
    <View className="rounded-xl border border-border bg-panel p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${difficulty.label}, ${summary}`}
        accessibilityHint={expanded ? 'Hides the boss list' : 'Shows the boss list'}
        onPress={onToggle}
        className="min-h-[44px] justify-center"
      >
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-sm font-semibold text-text">{difficulty.label}</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors['text-dim']} />
        </View>
      </Pressable>

      <View className="mt-2">
        <Meter
          label="Bosses defeated"
          // A raid with no bosses listed yet (a tier before it opens) would
          // otherwise divide by zero and render a NaN-wide bar.
          fraction={difficulty.total === 0 ? 0 : difficulty.killed / difficulty.total}
          valueText={summary}
          accessibilityLabel={`${difficulty.label} bosses defeated`}
        />
      </View>

      {expanded ? (
        <View className="mt-3 gap-2">
          {difficulty.bosses.length === 0 ? (
            <Text className="text-sm text-text-dim">No bosses reported for this difficulty yet.</Text>
          ) : (
            difficulty.bosses.map((boss) => (
              <View
                key={boss.name}
                accessible
                accessibilityLabel={
                  boss.killed
                    ? `${boss.name}, defeated${boss.lastKillTimestamp ? `, last kill ${timeAgo(boss.lastKillTimestamp)}` : ''}`
                    : `${boss.name}, not defeated`
                }
                className="flex-row items-center gap-2"
              >
                <Icon
                  name={boss.killed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={boss.killed ? colors.severity.bis : colors['text-dim']}
                />
                <Text className={`flex-1 text-sm ${boss.killed ? 'text-text' : 'text-text-dim'}`}>
                  {boss.name}
                </Text>
                {boss.killed && boss.lastKillTimestamp ? (
                  <Text className="text-xs text-text-dim">{timeAgo(boss.lastKillTimestamp)}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}
