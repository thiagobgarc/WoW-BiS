import type { DomainRaidProgress } from '@/lib/blizzard/domain';
import { timeAgo } from '@mythos/core/utils';

interface Props {
  progress: DomainRaidProgress;
}

export function RaidProgressionPanel({ progress }: Props) {
  return (
    <section aria-labelledby="raid-heading">
      <h2 id="raid-heading" className="text-lg font-bold [font-stretch:103%]">
        {progress.instanceName}
      </h2>

      <div className="mt-8 grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {progress.difficulties.map((diff) => (
          <div key={diff.difficulty}>
            <div className="flex items-baseline justify-between gap-4 border-b border-rule-strong pb-2">
              <h3 className="text-sm font-semibold">{diff.label}</h3>
              <p className="figure text-sm">
                <span className="font-semibold">{diff.killed}</span>
                <span className="text-text-dim">/{diff.total} defeated</span>
              </p>
            </div>

            <div className="mt-3 h-1 overflow-hidden bg-sunken">
              <div
                className="h-full bg-accent transition-[width] duration-150"
                style={{ width: `${diff.total === 0 ? 0 : (diff.killed / diff.total) * 100}%` }}
              />
            </div>

            <ul className="mt-2">
              {diff.bosses.map((boss) => (
                <li key={boss.name} className="flex items-center gap-2.5 border-b border-rule py-2 text-sm last:border-none">
                  <span aria-hidden="true" className={boss.killed ? 'text-severity-bis' : 'text-text-dim'}>
                    {boss.killed ? '✓' : '○'}
                  </span>
                  <span className={boss.killed ? 'truncate text-text' : 'truncate text-text-dim'}>{boss.name}</span>
                  {boss.killed && boss.lastKillTimestamp && (
                    <span className="label ml-auto shrink-0">{timeAgo(boss.lastKillTimestamp)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
