import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils/cn';
import type { DomainTalentNode } from '@/lib/blizzard/domain';

interface Selection {
  rank: number;
  optionIndex: number;
}

interface Props {
  node: DomainTalentNode;
  selection: Selection | null;
  style: React.CSSProperties;
}

export function TalentNode({ node, selection, style }: Props) {
  const option = node.options[selection?.optionIndex ?? 0] ?? node.options[0] ?? null;
  const isChoice = node.options.length > 1;

  if (!option) {
    // Structural node (e.g. the top-of-tree class/spec selector) — nothing to pick, nothing to show.
    return <div style={style} className="absolute w-3 h-3 rounded-full bg-white/10" aria-hidden="true" />;
  }

  const label = `${option.name}${node.maxRank > 1 ? `, rank ${selection?.rank ?? 0} of ${node.maxRank}` : ''}${isChoice ? ' (choice talent)' : ''}`;

  const trigger = (
    <button
      type="button"
      style={style}
      aria-label={label}
      className="absolute flex items-center justify-center cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {/*
        A diamond via clip-path only crops a rectangular border/shadow — it
        touches the box's straight edges at a single point per side, so the
        border and glow vanish almost everywhere instead of outlining the
        diamond. Rotating the box itself carries the border/shadow correctly;
        the icon is counter-rotated back upright and oversized (141% ≈ √2)
        so it fills the diamond with no clipped corners.
      */}
      <span
        className={cn(
          'relative block w-[71%] h-[71%] rotate-45 border bg-panel overflow-hidden transition-all duration-150',
          // Shape (diamond outline solid vs. dashed) conveys choice-vs-fixed,
          // not just color — dashed = pick-one-of-N, solid = fixed pick.
          isChoice ? 'border-dashed' : 'border-solid',
          selection
            ? 'border-accent opacity-100 shadow-[0_0_10px_var(--color-accent)]'
            : 'border-white/20 opacity-35 grayscale',
        )}
      >
        {/* Symmetric negative inset both oversizes (100% + 20.5%*2 ≈ 141%)
            and centers in one step — a percentage translate is relative to
            this element's own (now-scaled) size, not the parent, so it can't
            center reliably the way inset can. */}
        <span className="absolute -inset-[20.5%] flex items-center justify-center -rotate-45">
          {option.iconUrl ? (
            <img src={option.iconUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-[10px] text-text-dim" aria-hidden="true">
              ?
            </span>
          )}
        </span>
      </span>
      {selection && node.maxRank > 1 && (
        <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-2.5 h-2.5 rounded-full bg-severity-bis border border-bg text-[6px] font-bold leading-none text-bg">
          {selection.rank}
        </span>
      )}
    </button>
  );

  return (
    <Tooltip trigger={trigger}>
      <div className="space-y-1">
        <div className="font-semibold text-text">{option.name}</div>
        {isChoice && <div className="text-xs text-text-dim">Choice of: {node.options.map((o) => o.name).join(' / ')}</div>}
        {option.description && <div className="text-xs text-text-muted">{option.description}</div>}
        {node.maxRank > 1 && <div className="text-xs text-text-dim">Max rank {node.maxRank}</div>}
      </div>
    </Tooltip>
  );
}
