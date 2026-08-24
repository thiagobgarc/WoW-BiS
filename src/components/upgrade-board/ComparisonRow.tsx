import { useState } from 'react';
import type { ComparisonRow as ComparisonRowData } from '@/lib/bis/compareGear';
import { ItemIcon } from '@/components/character/ItemIcon';
import { SeverityChip } from './SeverityChip';
import { slotLabel } from '@/lib/utils/format';
import { sourceLabel } from '@/lib/utils/sourceLabel';

function deltaLabel(row: ComparisonRowData): string {
  if (row.severity === 'bis') return 'Match';
  if (!row.equipped) return 'Fill now';
  if (row.ilvlDelta <= 0) return 'Close';
  return `+${row.ilvlDelta} iLvl`;
}

export function ComparisonRow({ row }: { row: ComparisonRowData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-white/8 bg-panel p-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr] gap-4 items-center">
        <div className="flex items-center gap-3">
          <ItemIcon iconUrl={row.equipped?.iconUrl ?? null} quality={row.equipped?.quality ?? 'common'} alt={row.equipped?.name ?? 'Empty'} empty={!row.equipped} />
          <div className="min-w-0">
            {/* Quality is conveyed by the icon border, not text color — see SlotTile.tsx for why. */}
            <div className="text-sm font-semibold truncate text-text">{row.equipped?.name ?? 'Empty'}</div>
            <div className="text-xs text-text-dim">
              {slotLabel(row.physicalSlot)} • {row.equipped ? `${row.equipped.itemLevel} • Equipped` : 'Missing'}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-accent/30 bg-accent-soft p-2 text-center">
          <div className="text-xs text-text-muted">{row.severity === 'major-gap' && !row.equipped ? 'Critical' : deltaLabel(row) === 'Match' ? 'BiS' : 'Upgrade'}</div>
          <div className="text-sm font-bold text-accent">{deltaLabel(row)}</div>
          <div className="mt-1">
            <SeverityChip severity={row.severity} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {row.target ? (
            <>
              <ItemIcon iconUrl={null} quality="epic" alt={row.target.itemName} />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate text-text">{row.target.itemName}</div>
                <div className="text-xs text-text-dim">
                  {row.target.itemLevel} • BiS Rank {row.target.rank}
                </div>
                <div className="text-xs text-text-dim mt-1">{sourceLabel(row.target.source)}</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-text-dim italic">No BiS data for this slot yet</div>
          )}
        </div>
      </div>

      {row.alternatives.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/8">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-link cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            aria-expanded={expanded}
          >
            {expanded ? '▾' : '▸'} {row.alternatives.length} alternative{row.alternatives.length > 1 ? 's' : ''}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5">
              {row.alternatives.map((alt) => (
                <li key={alt.itemId} className="text-xs text-text-muted flex justify-between gap-2">
                  <span>
                    Rank {alt.rank}: {alt.itemName} ({alt.itemLevel})
                  </span>
                  <span className="text-text-dim shrink-0">{sourceLabel(alt.source)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
