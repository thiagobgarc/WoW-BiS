import type { DomainRaidProgress } from '@/lib/blizzard/domain';
import { timeAgo } from '@/lib/utils/format';

interface Props {
  progress: DomainRaidProgress;
}

export function RaidProgressionPanel({ progress }: Props) {
  return (
    <div className="rounded-xl border border-white/8 bg-panel p-5 space-y-6">
      <div className="text-lg font-bold">{progress.instanceName}</div>
      <div className="grid gap-6 sm:grid-cols-2">
        {progress.difficulties.map((diff) => (
          <div key={diff.difficulty} className="rounded-lg border border-white/8 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">{diff.label}</span>
              <span className="text-xs text-text-dim">
                {diff.killed}/{diff.total} defeated
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden mb-4">
              <div
                className="h-full bg-accent rounded-full transition-[width] duration-150"
                style={{ width: `${diff.total === 0 ? 0 : (diff.killed / diff.total) * 100}%` }}
              />
            </div>
            <ul className="space-y-1.5">
              {diff.bosses.map((boss) => (
                <li key={boss.name} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className={boss.killed ? 'text-severity-bis' : 'text-text-dim'}
                  >
                    {boss.killed ? '✓' : '○'}
                  </span>
                  <span className={boss.killed ? 'text-text' : 'text-text-dim'}>{boss.name}</span>
                  {boss.killed && boss.lastKillTimestamp && (
                    <span className="ml-auto text-xs text-text-dim">{timeAgo(boss.lastKillTimestamp)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
