import type { DomainItem, EquipmentSlot } from '@/lib/blizzard/domain';
import { ItemIcon } from './ItemIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { slotLabel } from '@/lib/utils/format';

interface Props {
  slot: EquipmentSlot;
  item: DomainItem | null;
}

export function SlotTile({ slot, item }: Props) {
  const emptySockets = item?.sockets.filter((s) => !s.filled).length ?? 0;

  const trigger = (
    <button
      className="w-full text-left flex flex-col gap-2 rounded-lg border border-white/8 bg-panel p-3 transition-colors duration-150 hover:border-accent/30 hover:bg-panel-hover cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={item ? `${slotLabel(slot)}: ${item.name}, item level ${item.itemLevel}` : `${slotLabel(slot)}: empty`}
    >
      <div className="text-[11px] font-semibold text-text-dim uppercase tracking-wide">{slotLabel(slot)}</div>
      <div className="flex items-center gap-3">
        <ItemIcon iconUrl={item?.iconUrl ?? null} quality={item?.quality ?? 'common'} alt={item?.name ?? 'Empty slot'} empty={!item} />
        <div className="flex-1 min-w-0">
          {item ? (
            <>
              {/* Quality is conveyed by the icon border color (WCAG non-text contrast), never by text
                  color — several canonical quality colors (epic purple, rare blue) fall below 4.5:1
                  against our dark panel as body text, so item names always render in the default
                  high-contrast text color. */}
              <div className="text-sm font-semibold truncate text-text">{item.name}</div>
              <div className="text-xs text-text-dim">
                {item.itemLevel}
                {item.isTierPiece ? ' • Tier' : ''}
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {item.sockets.map((s, i) =>
                  s.filled ? (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-link/20 text-link">
                      Socket: {s.gemName ?? 'Gem'}
                    </span>
                  ) : (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-severity-close/20 text-severity-close">
                      Empty socket
                    </span>
                  ),
                )}
                {item.isEmbellishment && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-severity-close/20 text-severity-close">Embellishment</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm italic text-text-dim">Empty</div>
              <div className="text-xs text-severity-gap">Needs fill</div>
            </>
          )}
        </div>
      </div>
    </button>
  );

  return (
    <Tooltip trigger={trigger}>
      {item ? (
        <div className="space-y-2">
          <div className="font-semibold text-text">{item.name}</div>
          <div className="text-xs text-text-muted">Item Level {item.itemLevel}</div>
          {item.enchantText && <div className="text-xs text-link">Enchant: {item.enchantText}</div>}
          {emptySockets > 0 && (
            <div className="text-xs text-severity-close">⚠ {emptySockets} empty socket{emptySockets > 1 ? 's' : ''}</div>
          )}
          <a href={item.wowheadUrl} target="_blank" rel="noreferrer" className="text-xs text-link inline-block mt-1">
            View on Wowhead ↗
          </a>
        </div>
      ) : (
        <div className="text-xs text-text-muted">No item equipped in this slot.</div>
      )}
    </Tooltip>
  );
}
