interface Props {
  bisSlotsCount: number;
  totalSlots: number;
  theoreticalMaxIlvl: number;
  currentIlvl: number;
}

export function CompletionMeter({ bisSlotsCount, totalSlots, theoreticalMaxIlvl, currentIlvl }: Props) {
  const pct = totalSlots > 0 ? (bisSlotsCount / totalSlots) * 100 : 0;

  return (
    <div className="rounded-lg bg-panel p-4">
      <div className="text-xs text-text-dim mb-2">Raid BiS completion</div>
      <div
        className="h-6 rounded bg-bg overflow-hidden flex"
        role="progressbar"
        aria-valuenow={bisSlotsCount}
        aria-valuemin={0}
        aria-valuemax={totalSlots}
        aria-label={`${bisSlotsCount} of ${totalSlots} BiS slots`}
      >
        <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
        <div className="h-full bg-white/10" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="text-sm font-semibold mt-2">
        {bisSlotsCount} of {totalSlots} slots • Theoretical max: {theoreticalMaxIlvl} iLvl (current: {currentIlvl})
      </div>
    </div>
  );
}
