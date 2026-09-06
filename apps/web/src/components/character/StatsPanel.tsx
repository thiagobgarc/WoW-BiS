import type { SecondaryStats } from '@/lib/blizzard/domain';

interface Props {
  stats: SecondaryStats;
  /** Stat priority order, highest first, e.g. ['haste','crit','versatility','mastery']. Optional until Phase 3 wires real spec data. */
  priorityOrder?: (keyof SecondaryStats)[];
}

const STAT_LABELS: Record<keyof SecondaryStats, string> = {
  haste: 'Haste',
  crit: 'Critical Strike',
  versatility: 'Versatility',
  mastery: 'Mastery',
};

export function StatsPanel({ stats, priorityOrder }: Props) {
  const order = priorityOrder ?? (['haste', 'crit', 'versatility', 'mastery'] as const);
  const maxPercent = Math.max(...order.map((k) => stats[k].percent), 1);

  return (
    <div className="rounded-xl border border-white/8 bg-panel p-5">
      <div className="text-sm font-semibold mb-4">
        Secondary Stats
        {priorityOrder && <span className="text-text-dim font-normal"> ({priorityOrder.map((k) => STAT_LABELS[k]).join(' > ')})</span>}
      </div>
      <div className="space-y-3">
        {order.map((key) => {
          const stat = stats[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-sm text-text-muted">{STAT_LABELS[key]}</div>
              <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-[width] duration-150"
                  style={{ width: `${(stat.percent / maxPercent) * 100}%` }}
                />
              </div>
              <div className="w-28 shrink-0 text-right text-sm font-semibold">
                {stat.rating} ({stat.percent}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
