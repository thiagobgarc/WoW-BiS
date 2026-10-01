import type { DomainMythicPlusProfile } from '@/lib/blizzard/domain';
import { timeAgo } from '@mythos/core/utils';

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
    <section aria-labelledby="mplus-heading">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label">Mythic+ rating</p>
          <p className="figure mt-1.5 text-[clamp(2.25rem,6vw,3rem)] font-extrabold leading-none" id="mplus-heading">
            {profile.rating !== null ? profile.rating.toFixed(1) : '—'}
          </p>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">Best run per dungeon this season</caption>
          <thead>
            <tr className="border-b border-rule-strong text-left">
              <th scope="col" className="label pb-2 pr-3 font-medium">Dungeon</th>
              <th scope="col" className="label pb-2 pr-3 text-right font-medium">Level</th>
              <th scope="col" className="label pb-2 pr-3 font-medium">Timed</th>
              <th scope="col" className="label pb-2 pr-3 text-right font-medium">Score</th>
              <th scope="col" className="label pb-2 pr-3 text-right font-medium">Duration</th>
              <th scope="col" className="label pb-2 text-right font-medium">Completed</th>
            </tr>
          </thead>
          <tbody>
            {profile.dungeons.map(({ dungeon, run }) => (
              <tr key={dungeon} className="border-b border-rule last:border-0">
                <th scope="row" className="py-2.5 pr-3 text-left font-medium">{dungeon}</th>
                {run ? (
                  <>
                    <td className="figure py-2.5 pr-3 text-right font-semibold">+{run.level}</td>
                    <td className="py-2.5 pr-3">
                      {run.timed ? (
                        <span className="text-severity-bis" aria-hidden="true">✓</span>
                      ) : (
                        <span className="text-severity-gap" aria-hidden="true">✕</span>
                      )}
                      <span className="sr-only">{run.timed ? 'Timed' : 'Depleted'}</span>
                    </td>
                    <td className="figure py-2.5 pr-3 text-right">{run.score !== null ? run.score.toFixed(1) : '—'}</td>
                    <td className="figure py-2.5 pr-3 text-right text-text-muted">{formatDuration(run.durationMs)}</td>
                    <td className="py-2.5 text-right text-text-dim">{timeAgo(run.completedAt)}</td>
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
    </section>
  );
}
