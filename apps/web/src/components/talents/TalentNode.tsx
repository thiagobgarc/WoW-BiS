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
    // `style` already carries the node's grid-derived width/height.
    return <div style={style} className="absolute rounded-full bg-white/10" aria-hidden="true" />;
  }

  const label = `${option.name}${node.maxRank > 1 ? `, rank ${selection?.rank ?? 0} of ${node.maxRank}` : ''}${isChoice ? ' (choice talent)' : ''}`;

  const trigger = (
    <button
      type="button"
      style={style}
      aria-label={label}
      className="absolute flex items-center justify-center cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span
        className={cn(
          'relative block w-full h-full rounded-md border bg-panel overflow-hidden transition-all duration-150',
          // Border style (dashed vs. solid) conveys choice-vs-fixed, not just color.
          isChoice ? 'border-dashed' : 'border-solid',
          selection
            ? 'border-accent opacity-100 shadow-[0_0_10px_var(--color-accent)]'
            : 'border-white/20 opacity-35 grayscale',
        )}
      >
        {option.iconUrl ? (
          <img src={option.iconUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-xs text-text-dim" aria-hidden="true">
            ?
          </span>
        )}
      </span>
      {selection && node.maxRank > 1 && (
        <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-severity-bis border border-bg text-[10px] font-bold leading-none text-bg">
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
