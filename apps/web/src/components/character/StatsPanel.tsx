import type { SecondaryStats } from '@/lib/blizzard/domain';

interface Props {
  stats: SecondaryStats;
  /** Stat priority order, highest first, e.g. ['haste','crit','versatility','mastery']. */
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
    <section aria-labelledby="stats-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule-strong pb-2.5">
        <h2 id="stats-heading" className="text-sm font-semibold">
          Secondary stats
        </h2>
        {priorityOrder && <p className="label">Priority {priorityOrder.map((k) => STAT_LABELS[k]).join(' › ')}</p>}
      </div>

      <div>
        {order.map((key) => {
          const stat = stats[key];
          return (
            <div key={key} className="grid grid-cols-[8rem_1fr_auto] items-center gap-4 border-b border-rule py-3">
              <div className="truncate text-sm text-text-muted">{STAT_LABELS[key]}</div>
              {/* The bar is non-text, so the class color is safe here. */}
              <div className="h-1.5 overflow-hidden bg-sunken">
                <div
                  className="h-full bg-accent transition-[width] duration-150"
                  style={{ width: `${(stat.percent / maxPercent) * 100}%` }}
                />
              </div>
              <div className="figure w-24 text-right text-sm">
                <span className="font-semibold">{stat.percent}%</span>
                <span className="pl-2 text-text-dim">{stat.rating}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
