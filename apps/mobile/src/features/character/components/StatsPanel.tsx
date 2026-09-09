/**
 * Secondary stats as horizontal bars, in stat-priority order.
 *
 * mobile-ux.md: "compact horizontal bars, stat-priority order preserved
 * (from `bis.statPriority` when seeded), values as text — never color
 * alone." The bars are all one color for exactly that reason: what ranks
 * them is their position in the list, which is the spec's own priority, and
 * the number beside each one.
 *
 * Bars are scaled against the largest stat rather than against 100%, the
 * same as the web. Percentages here cluster in the teens and twenties, so a
 * 0–100 scale would render four near-identical stubs and show nothing.
 */
import { Text, View } from 'react-native';
import type { SecondaryStats } from '@mythos/core/character';
import type { StatPriority } from '@mythos/core/bis';

import { Meter } from '@/components/Meter';

type StatKey = keyof SecondaryStats;

const STAT_LABELS: Record<StatKey, string> = {
  haste: 'Haste',
  crit: 'Critical Strike',
  versatility: 'Versatility',
  mastery: 'Mastery',
};

/** The order the web falls back to when a spec has no seeded priority. */
const DEFAULT_ORDER: StatKey[] = ['haste', 'crit', 'versatility', 'mastery'];

interface StatsPanelProps {
  stats: SecondaryStats;
  /** Highest first. Absent when the spec isn't seeded — see CharacterBis. */
  priority?: StatPriority;
}

export function StatsPanel({ stats, priority }: StatsPanelProps) {
  // StatPrioritySchema is fixed at four entries, so this is present-or-absent,
  // never partially filled.
  const order = priority ?? DEFAULT_ORDER;
  // Guarded at 1 so a level-1 character with four zeroed stats divides by
  // something rather than rendering NaN-wide bars.
  const highest = Math.max(...order.map((key) => stats[key].percent), 1);

  return (
    <View className="rounded-xl border border-border bg-panel p-4">
      <Text accessibilityRole="header" className="text-sm font-semibold text-text">
        Secondary stats
      </Text>
      {priority ? (
        <Text className="mt-0.5 text-xs text-text-dim">
          {priority.map((key) => STAT_LABELS[key]).join(' > ')}
        </Text>
      ) : (
        <Text className="mt-0.5 text-xs text-text-dim">
          No seeded stat priority for this spec — shown in the default order.
        </Text>
      )}

      <View className="mt-4 gap-3">
        {order.map((key) => {
          const stat = stats[key];
          return (
            <Meter
              key={key}
              label={STAT_LABELS[key]}
              fraction={stat.percent / highest}
              valueText={`${stat.rating} (${stat.percent}%)`}
              accessibilityLabel={`${STAT_LABELS[key]}, rating ${stat.rating}`}
            />
          );
        })}
      </View>
    </View>
  );
}
