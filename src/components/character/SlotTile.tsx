import type { DomainItem, EquipmentSlot } from '@/lib/blizzard/domain';
import { ItemIcon } from './ItemIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { slotLabel } from '@/lib/utils/format';
import { qualityColor } from '@/lib/utils/itemQuality';

interface Props {
  slot: EquipmentSlot;
  item: DomainItem | null;
}

export function SlotTile({ slot, item }: Props) {
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
        // Mirrors the in-game tooltip's own ordering: name, item level, binding,
        // slot/armor type, stats, enchant, gems, procs, set info, requirements.
        <div className="space-y-1.5 text-xs">
          <div className="font-semibold text-sm" style={{ color: qualityColor(item.quality) }}>
            {item.name}
          </div>
          <div className="text-text-muted">Item Level {item.itemLevel}</div>
          {item.bindingText && <div className="text-text-dim">{item.bindingText}</div>}
          {(item.armorTypeLabel || item.armorLine) && (
            <div className="flex justify-between gap-3 text-text-dim">
              <span>{slotLabel(slot)}</span>
              {item.armorTypeLabel && <span>{item.armorTypeLabel}</span>}
            </div>
          )}
          {item.armorLine && <div style={{ color: item.armorLine.color }}>{item.armorLine.text}</div>}
          {item.weaponLines.map((line) => (
            <div key={line} className="text-text-dim">
              {line}
            </div>
          ))}
          {item.stats.map((s) => (
            <div key={s.text} style={{ color: s.color }}>
              {s.text}
            </div>
          ))}
          {item.enchantText && <div className="text-link">{item.enchantText}</div>}
          {item.sockets.map((s, i) => (
            <div key={i} className={s.filled ? 'text-link' : 'text-severity-gap'}>
              {s.filled ? `Socket: ${s.gemName ?? 'Gem'}` : 'Empty Socket'}
            </div>
          ))}
          {item.procs.map((p) => (
            <div key={p} className="text-text-muted italic">
              {p}
            </div>
          ))}
          {item.setInfo && (
            <div className="pt-1.5 mt-1.5 border-t border-white/8 space-y-1">
              <div className="text-severity-close font-semibold">
                {item.setInfo.name}
                {item.setInfo.totalCount > 0 && ` (${item.setInfo.ownedCount}/${item.setInfo.totalCount})`}
              </div>
              {item.setInfo.effects.map((e) => (
                <div key={e.text} className={e.active ? 'text-severity-bis' : 'text-text-dim'}>
                  ({e.requiredCount}) {e.text}
                </div>
              ))}
            </div>
          )}
          {(item.requiredLevelText || item.classesText) && (
            <div className="pt-1 space-y-0.5">
              {item.requiredLevelText && <div className="text-text-dim">{item.requiredLevelText}</div>}
              {item.classesText && <div className="text-link">{item.classesText}</div>}
            </div>
          )}
          <a href={item.wowheadUrl} target="_blank" rel="noreferrer" className="text-link inline-block pt-1">
            View on Wowhead ↗
          </a>
        </div>
      ) : (
        <div className="text-xs text-text-muted">No item equipped in this slot.</div>
      )}
    </Tooltip>
  );
}
