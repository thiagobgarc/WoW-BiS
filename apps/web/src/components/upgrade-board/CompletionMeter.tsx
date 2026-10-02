import type { ContentType } from '@mythos/core/bis';

interface Props {
  bisSlotsCount: number;
  totalSlots: number;
  theoreticalMaxIlvl: number;
  currentIlvl: number;
  /** Which content type the count is for. The label used to be hardcoded to
   *  "Raid" while the figures recomputed per tab, so a Mythic+ or PvP count
   *  was reported under the raid heading. */
  contentType: ContentType;
}

const CONTENT_LABEL: Record<ContentType, string> = {
  raid: 'Raid',
  'mythic-plus': 'Mythic+',
  pvp: 'PvP',
};

export function CompletionMeter({ bisSlotsCount, totalSlots, theoreticalMaxIlvl, currentIlvl, contentType }: Props) {
  const pct = totalSlots > 0 ? (bisSlotsCount / totalSlots) * 100 : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="label">{CONTENT_LABEL[contentType]} best in slot</p>
          {/* The page's headline claim, so it is the page's largest figure. */}
          <p className="figure mt-1.5 text-[clamp(2.25rem,6vw,3rem)] font-extrabold leading-none">
            <span>{bisSlotsCount}</span>
            <span className="pl-3 text-text-dim">of {totalSlots} slots</span>
          </p>
        </div>

        <dl className="flex gap-10">
          <div>
            <dt className="label">Item level now</dt>
            <dd className="figure mt-1 text-xl font-semibold">{currentIlvl}</dd>
          </div>
          <div>
            <dt className="label">At full best in slot</dt>
            <dd className="figure mt-1 text-xl font-semibold">{theoreticalMaxIlvl}</dd>
          </div>
        </dl>
      </div>

      <div
        className="mt-5 h-1.5 overflow-hidden bg-sunken"
        role="progressbar"
        aria-valuenow={bisSlotsCount}
        aria-valuemin={0}
        aria-valuemax={totalSlots}
        aria-label={`${bisSlotsCount} of ${totalSlots} BiS slots`}
      >
        {/* The one piece of motion in the app that nobody asked for. */}
        <div className="meter-fill h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
