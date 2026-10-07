import { TooltipProvider, Tooltip } from '@/components/ui/Tooltip';
import { ItemIcon } from '@/components/character/ItemIcon';
import type { BisItemTooltip } from '@/lib/blizzard/itemTooltip';
import type { BisEntry } from '@mythos/core/bis';
import { slotLabel, sourceLabel } from '@mythos/core/utils';
import { BisItemTooltipCard } from './BisItemTooltipCard';

export interface BisTableRow {
  slot: string;
  entry: BisEntry | null;
  /** Shown across the row when `entry` is null. */
  emptyText: string;
}

interface Props {
  rows: BisTableRow[];
  icons: Record<number, string>;
  tooltips: Record<number, BisItemTooltip>;
}

/**
 * One content type's BiS table. An island only so items can carry a tooltip:
 * the markup is server-rendered in full first, so crawlers and no-JS readers
 * get the same table they always did.
 */
export function BisItemTable({ rows, icons, tooltips }: Props) {
  return (
    <TooltipProvider>
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-rule-strong">
            <th scope="col" className="label py-2 pr-4 font-medium">
              Slot
            </th>
            <th scope="col" className="label py-2 pr-4 font-medium">
              Item
            </th>
            <th scope="col" className="label py-2 pr-4 text-right font-medium">
              Used by
            </th>
            <th scope="col" className="label py-2 pr-4 text-right font-medium">
              Item level
            </th>
            <th scope="col" className="label py-2 font-medium">
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ slot, entry, emptyText }, i) => (
            <tr key={`${slot}-${i}`} className="border-b border-rule">
              <th scope="row" className="py-2.5 pr-4 font-normal text-text-muted">
                {slotLabel(slot)}
              </th>
              {entry ? (
                <>
                  <td className="py-2.5 pr-4 font-medium">
                    <div className="flex items-center gap-3">
                      <ItemIcon size="sm" iconUrl={icons[entry.itemId] ?? null} quality="epic" alt="" />
                      <span>
                        <Tooltip
                          trigger={
                            <a href={`https://www.wowhead.com/item=${entry.itemId}`} className="link" rel="noreferrer">
                              {entry.itemName}
                            </a>
                          }
                        >
                          <BisItemTooltipCard item={entry} detail={tooltips[entry.itemId]} />
                        </Tooltip>
                        {entry.tierPiece && <span className="label ml-2">Tier</span>}
                      </span>
                    </div>
                  </td>
                  <td className="figure py-2.5 pr-4 text-right">
                    {entry.popularity === undefined ? <span className="text-text-dim">—</span> : `${entry.popularity}%`}
                  </td>
                  <td className="figure py-2.5 pr-4 text-right">{entry.itemLevel}</td>
                  <td className="py-2.5 text-text-muted">{sourceLabel(entry.source)}</td>
                </>
              ) : (
                <td colSpan={4} className="py-2.5 text-text-dim">
                  {emptyText}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </TooltipProvider>
  );
}
