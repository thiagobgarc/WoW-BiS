import type { BisItemTooltip } from '@/lib/blizzard/itemTooltip';
import type { Source } from '@mythos/core/bis';
import { qualityColor, slotLabel, sourceLabel } from '@mythos/core/utils';

/** Blizzard's own tooltip green for secondary stats, as on the character page. */
const SECONDARY_COLOR = 'rgba(0, 255, 0, 1)';

export interface TooltipItem {
  itemName: string;
  itemLevel: number;
  /** BiS slot, labelled when Blizzard detail is missing. */
  slot: string;
  source: Source;
}

/**
 * Mirrors SlotTile's tooltip — same card, same ordering as the in-game one —
 * but for an item nobody is wearing yet. Blizzard only describes such an item
 * at its base item level, so instead of stat lines that would be wrong at the
 * listed level, it shows what holds at any level: which primary stat, and how
 * the secondary budget is split. See lib/blizzard/itemTooltip.ts.
 *
 * Used by the BiS page's tables and the character page's upgrade board.
 */
export function BisItemTooltipCard({ item, detail }: { item: TooltipItem; detail: BisItemTooltip | undefined }) {
  const showsBaseLevelNumbers = Boolean(
    detail && detail.baseItemLevel !== item.itemLevel && detail.effects.some((e) => /\d/.test(e)),
  );

  return (
    <div className="w-72 space-y-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: qualityColor('epic') }} aria-hidden="true" />
        <span className="text-sm font-semibold text-text">{item.itemName}</span>
      </div>
      {detail?.nameDescription && <div style={{ color: detail.nameDescription.color }}>{detail.nameDescription.text}</div>}
      <div className="figure text-text-muted">Item Level {item.itemLevel}</div>
      {detail?.bindingText && <div className="text-text-dim">{detail.bindingText}</div>}
      {detail?.uniqueText && <div className="text-text-dim">{detail.uniqueText}</div>}

      <div className="flex justify-between gap-3 text-text-dim">
        <span>{detail?.slotText ?? slotLabel(item.slot)}</span>
        {detail?.typeText && <span>{detail.typeText}</span>}
      </div>
      {detail?.weaponSpeed && <div className="text-text-dim">{detail.weaponSpeed}</div>}
      {detail?.primaryStat && <div className="text-text">{detail.primaryStat}</div>}

      {detail && detail.secondaries.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="label">Secondary stats, by share</div>
          {detail.secondaries.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between gap-3">
                <span style={{ color: SECONDARY_COLOR }}>{s.label}</span>
                <span className="figure text-text-muted">{s.share}%</span>
              </div>
              <div className="mt-0.5 h-[2px] bg-white/8" aria-hidden="true">
                <div className="h-full" style={{ width: `${s.share}%`, background: SECONDARY_COLOR, opacity: 0.6 }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {detail?.tertiaries.map((t) => (
        <div key={t} style={{ color: SECONDARY_COLOR }}>
          {t}
        </div>
      ))}

      {detail?.effects.map((e) => (
        <div key={e} className="whitespace-pre-line pt-1 text-text-muted">
          {e}
        </div>
      ))}

      {detail?.setName && <div className="pt-1 font-semibold text-severity-close">{detail.setName}</div>}
      {detail?.flavorText && <div className="italic text-text-dim">“{detail.flavorText}”</div>}

      {(detail?.requiredLevelText || detail?.classesText) && (
        <div className="space-y-0.5 pt-1">
          {detail.requiredLevelText && <div className="text-text-dim">{detail.requiredLevelText}</div>}
          {detail.classesText && <div className="text-text-muted">{detail.classesText}</div>}
        </div>
      )}

      <div className="border-t border-rule pt-1.5 text-text-muted">{sourceLabel(item.source)}</div>
      {showsBaseLevelNumbers && (
        <p className="text-[11px] leading-snug text-text-dim">
          Effect numbers are at base item level {detail!.baseItemLevel}; they're higher at {item.itemLevel}.
        </p>
      )}
    </div>
  );
}
