import { useState } from 'react';
import type { ComparisonRow as ComparisonRowData } from '@mythos/core/bis';
import { ItemIcon } from '@/components/character/ItemIcon';
import { SeverityChip, SEVERITY_RULE } from './SeverityChip';
import { slotLabel, sourceLabel } from '@mythos/core/utils';

/** The unit under the delta figure. Only rows that can actually move carry
 *  one — the severity chip already names the state of every other row, and
 *  repeating it here put "Close enough" above "~ Close" on fourteen rows. */
function unit(row: ComparisonRowData): string {
  return row.ilvlDelta === 1 ? "item level" : "item levels";
}

export function ComparisonRow({ row, targetIconUrl }: { row: ComparisonRowData; targetIconUrl: string | null }) {
  const [expanded, setExpanded] = useState(false);
  // The delta column is deliberately sparse: only the slots that can still
  // move carry a figure, so the column reads as the list of actual gaps.
  const gain = row.ilvlDelta > 0 ? row.ilvlDelta : null;

  return (
    <div className="grid gap-5 border-b border-rule py-5 md:grid-cols-[1fr_9rem]">
      <div className="min-w-0">
        <p className="label">{slotLabel(row.physicalSlot)}</p>

        <div className="mt-2.5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <ItemIcon
              size="sm"
              iconUrl={row.equipped?.iconUrl ?? null}
              quality={row.equipped?.quality ?? 'common'}
              alt={row.equipped?.name ?? 'Empty'}
              empty={!row.equipped}
            />
            <div className="min-w-0">
              {/* Quality is conveyed by the icon border, not text color — see SlotTile.tsx for why. */}
              <div className="truncate text-sm font-semibold text-text">{row.equipped?.name ?? 'Nothing equipped'}</div>
              <div className="figure label mt-0.5">{row.equipped ? `${row.equipped.itemLevel} equipped` : 'Empty slot'}</div>
            </div>
          </div>

          {row.target ? (
            <div className="relative flex items-center gap-3">
              {/* A relational mark rather than decoration: it is what makes the
                  two halves of the row read as "this becomes that". */}
              <span className="absolute -left-4 hidden text-text-dim sm:block" aria-hidden="true">
                →
              </span>
              <ItemIcon size="sm" iconUrl={targetIconUrl} quality="epic" alt={row.target.itemName} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-text">{row.target.itemName}</div>
                <div className="figure label mt-0.5">
                  {row.target.itemLevel}, rank {row.target.rank}
                </div>
                <div className="label truncate">{sourceLabel(row.target.source)}</div>
              </div>
            </div>
          ) : (
            <div className="self-center text-sm italic text-text-dim">No best-in-slot data for this slot yet</div>
          )}
        </div>

        {row.alternatives.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="cursor-pointer text-xs text-text-muted transition-colors duration-150 hover:text-text"
              aria-expanded={expanded}
            >
              {expanded ? '▾' : '▸'} {row.alternatives.length} alternative{row.alternatives.length > 1 ? 's' : ''}
            </button>
            {expanded && (
              <ul className="mt-2">
                {row.alternatives.map((alt) => (
                  <li key={alt.itemId} className="flex justify-between gap-4 border-b border-rule py-1.5 text-xs text-text-muted last:border-none">
                    <span className="truncate">
                      <span className="figure text-text-dim">Rank {alt.rank}</span> {alt.itemName}
                    </span>
                    <span className="figure shrink-0 text-text-dim">
                      {alt.itemLevel}, {sourceLabel(alt.source)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/*
       * The delta column. This is where the page spends its boldness: one
       * right-aligned stack of large tabular figures running down the board,
       * so the size of every remaining gap is legible in a single glance down
       * the right edge. The severity rule above each figure ties the colour to
       * the number; the chip keeps the colorblind-safe icon + label pairing.
       */}
      <div className="flex flex-col items-start gap-2 md:items-end md:border-l md:border-rule md:pl-5">
        <span className={`h-[3px] w-8 ${SEVERITY_RULE[row.severity]}`} aria-hidden="true" />
        {gain !== null && (
          <>
            <p className="figure text-[2.25rem] font-extrabold leading-none">+{gain}</p>
            <p className="label md:text-right">{unit(row)}</p>
          </>
        )}
        <SeverityChip severity={row.severity} />
      </div>
    </div>
  );
}
