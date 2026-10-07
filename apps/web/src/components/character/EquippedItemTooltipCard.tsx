import type { DomainItem, EquipmentSlot } from '@/lib/blizzard/domain';
import { slotLabel, qualityColor, trackLabel } from '@mythos/core/utils';

/**
 * The tooltip for an item the character is wearing. Unlike a BiS item's
 * (BisItemTooltipCard), every stat line here is exact: Blizzard sends them
 * per character, already scaled to the item's level, in its own colors.
 *
 * Mirrors the in-game tooltip's own ordering: name, item level, binding,
 * slot/armor type, stats, enchant, gems, procs, set info, requirements.
 * Used by the paper doll and the upgrade board's equipped column.
 */
export function EquippedItemTooltipCard({ item, slot }: { item: DomainItem; slot: EquipmentSlot }) {
  return (
    <div className="space-y-1.5 text-xs">
      {/* The name used to be set in the quality color here, which is the
          one thing the rest of the app is careful never to do — rare is
          3.60:1 and epic 3.55:1 against this surface. The canonical color
          is kept as the swatch, and the name stays readable. */}
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: qualityColor(item.quality) }} aria-hidden="true" />
        <span className="text-sm font-semibold text-text">{item.name}</span>
      </div>
      <div className="figure text-text-muted">Item Level {item.itemLevel}</div>
      {item.upgradeTrack && <div className="figure text-text-muted">Upgrade Level: {trackLabel(item.upgradeTrack)}</div>}
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
  );
}
