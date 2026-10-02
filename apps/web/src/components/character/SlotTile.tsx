import type { DomainItem, EquipmentSlot } from '@/lib/blizzard/domain';
import { ItemIcon } from './ItemIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { slotLabel, qualityColor } from '@mythos/core/utils';

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
        // Mirrors the in-game tooltip's own ordering: name, item level, binding,
        // slot/armor type, stats, enchant, gems, procs, set info, requirements.
        <div className="space-y-1.5 text-xs">
          {/* The name used to be set in the quality color here, which is the
              one thing the rest of the app is careful never to do — rare is
              3.60:1 and epic 3.55:1 against this surface. The canonical color
              is kept as the swatch, and the name stays readable. */}
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[1px]"
              style={{ background: qualityColor(item.quality) }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-text">{item.name}</span>
          </div>
          <div className="figure text-text-muted">Item Level {item.itemLevel}</div>
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
          {item.enchantText && <div className="text-text">{item.enchantText}</div>}
          {item.sockets.map((s, i) => (
            <div key={i} className={s.filled ? 'text-text-muted' : 'text-severity-gap'}>
              {s.filled ? `Socket: ${s.gemName ?? 'Gem'}` : 'Empty Socket'}
            </div>
          ))}
          {item.procs.map((p) => (
            <div key={p} className="italic text-text-muted">
              {p}
            </div>
          ))}
          {item.setInfo && (
            <div className="mt-1.5 space-y-1 border-t border-rule pt-1.5">
              <div className="font-semibold text-severity-close">
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
            <div className="space-y-0.5 pt-1">
              {item.requiredLevelText && <div className="text-text-dim">{item.requiredLevelText}</div>}
              {item.classesText && <div className="text-text-muted">{item.classesText}</div>}
            </div>
          )}
          <a href={item.wowheadUrl} target="_blank" rel="noreferrer" className="link inline-block pt-1">
            View on Wowhead
          </a>
        </div>
      ) : (
        <div className="text-xs text-text-muted">No item equipped in this slot.</div>
      )}
    </Tooltip>
  );
}
