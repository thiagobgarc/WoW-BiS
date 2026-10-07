import type { DomainItem, EquipmentSlot } from '@/lib/blizzard/domain';
import { ItemIcon } from './ItemIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { slotLabel } from '@mythos/core/utils';
import { EquippedItemTooltipCard } from './EquippedItemTooltipCard';

interface Props {
  slot: EquipmentSlot;
  item: DomainItem | null;
}

function Marker({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' }) {
  return (
    <span
      className={`rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium [font-stretch:90%] ${
        tone === 'warn' ? 'bg-severity-close/15 text-severity-close' : 'bg-white/8 text-text-muted'
      }`}
    >
      {children}
    </span>
  );
}

export function SlotTile({ slot, item }: Props) {
  const trigger = (
    /* A row in a manifest, not a card. Sixteen slots share one continuous set
       of hairlines and one right-aligned item-level column, because the thing
       a player actually does here is read that column top to bottom. */
    <button
      className="grid w-full min-h-[60px] grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-rule py-3 text-left transition-colors duration-150 hover:bg-white/4"
      aria-label={item ? `${slotLabel(slot)}: ${item.name}, item level ${item.itemLevel}` : `${slotLabel(slot)}: empty`}
    >
      <ItemIcon iconUrl={item?.iconUrl ?? null} quality={item?.quality ?? 'common'} alt={item?.name ?? 'Empty slot'} empty={!item} />

      <div className="min-w-0">
        {item ? (
          <>
            {/* Quality is conveyed by the icon border color (WCAG non-text
                contrast), never by text color — several canonical quality
                colors (epic purple, rare blue) fall below 4.5:1 against this
                ground as body text, so item names always render in the
                default high-contrast text color. */}
            <div className="truncate text-sm font-semibold text-text">{item.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="label">{slotLabel(slot)}</span>
              {item.isTierPiece && <Marker>Tier</Marker>}
              {item.sockets.map((s, i) =>
                s.filled ? (
                  <Marker key={i}>{s.gemName ?? 'Gem'}</Marker>
                ) : (
                  <Marker key={i} tone="warn">
                    Empty socket
                  </Marker>
                ),
              )}
              {item.isEmbellishment && <Marker>Embellished</Marker>}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-text-dim">Nothing equipped</div>
            <div className="label mt-1 text-severity-gap">{slotLabel(slot)}</div>
          </>
        )}
      </div>

      <div className="figure w-12 text-right text-lg font-semibold">
        {item ? item.itemLevel : <span className="text-text-dim">—</span>}
      </div>
    </button>
  );

  return (
    <Tooltip trigger={trigger}>
      {item ? (
        <EquippedItemTooltipCard item={item} slot={slot} />
      ) : (
        <div className="text-xs text-text-muted">No item equipped in this slot.</div>
      )}
    </Tooltip>
  );
}
