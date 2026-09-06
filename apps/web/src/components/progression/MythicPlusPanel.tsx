import type { DomainMythicPlusProfile } from '@/lib/blizzard/domain';
import { timeAgo } from '@/lib/utils/format';

interface Props {
  profile: DomainMythicPlusProfile;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MythicPlusPanel({ profile }: Props) {
  return (
    <div className="rounded-xl border border-white/8 bg-panel p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">Mythic+ Score</div>
        <div className="px-3 py-1.5 rounded bg-white/8 text-link font-semibold text-lg">
          {profile.rating !== null ? profile.rating.toFixed(1) : '—'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-dim border-b border-white/8">
              <th className="py-2 pr-3 font-medium">Dungeon</th>
              <th className="py-2 pr-3 font-medium">Level</th>
              <th className="py-2 pr-3 font-medium">Timed</th>
              <th className="py-2 pr-3 font-medium">Score</th>
              <th className="py-2 pr-3 font-medium">Duration</th>
              <th className="py-2 font-medium">Completed</th>
            </tr>
          </thead>
          <tbody>
            {profile.dungeons.map(({ dungeon, run }) => (
              <tr key={dungeon} className="border-b border-white/5 last:border-0">
                <td className="py-2.5 pr-3 font-medium">{dungeon}</td>
                {run ? (
                  <>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded bg-white/8 text-link font-semibold">+{run.level}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {run.timed ? (
                        <span className="text-severity-bis" aria-hidden="true">✓</span>
                      ) : (
                        <span className="text-severity-gap" aria-hidden="true">✕</span>
                      )}
                      <span className="sr-only">{run.timed ? 'Timed' : 'Depleted'}</span>
                    </td>
                    <td className="py-2.5 pr-3">{run.score !== null ? run.score.toFixed(1) : '—'}</td>
                    <td className="py-2.5 pr-3 text-text-muted">{formatDuration(run.durationMs)}</td>
                    <td className="py-2.5 text-text-dim">{timeAgo(run.completedAt)}</td>
                  </>
                ) : (
                  <td colSpan={5} className="py-2.5 text-text-dim">
                    Not run this season
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
