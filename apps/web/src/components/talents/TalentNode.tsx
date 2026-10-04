import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils/cn';
import type { DomainTalentNode, TalentOption } from '@/lib/blizzard/domain';

export interface NodeSelection {
  rank: number;
  optionIndex: number;
}

interface Props {
  node: DomainTalentNode;
  selection: NodeSelection | null;
  /** Recommended view: this pick isn't in the character's current build. */
  missing: boolean;
  /** Position and width as percentages of the tree; height follows width. */
  style: React.CSSProperties;
}

const OCTAGON = 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)';

/**
 * The shape says what kind of talent it is, the way the in-game tree does:
 * square for an active ability, circle for a passive, octagon for a choice.
 * Each shape is two stacked layers — the outer one is the ring, the inner
 * one holds the icon — because a CSS border can't follow a clip-path.
 */
function shapeStyle(node: DomainTalentNode): { className: string; style?: React.CSSProperties } {
  if (node.options.length > 1) return { className: '', style: { clipPath: OCTAGON } };
  if (node.type === 'passive') return { className: 'rounded-full' };
  return { className: 'rounded-[18%]' };
}

function Icon({ option, dim }: { option: TalentOption; dim: boolean }) {
  return option.iconUrl ? (
    <img
      src={option.iconUrl}
      alt=""
      loading="lazy"
      className={cn('h-full w-full object-cover', dim && 'opacity-40 grayscale')}
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-[10px] text-text-dim" aria-hidden="true">
      ?
    </span>
  );
}

export function TalentNode({ node, selection, missing, style }: Props) {
  const isChoice = node.options.length > 1;
  const picked = selection !== null;
  const option = node.options[selection?.optionIndex ?? 0] ?? node.options[0]!;
  const shape = shapeStyle(node);
  const rank = selection?.rank ?? 0;
  const full = picked && rank >= node.maxRank;

  const ring = !picked
    ? 'var(--color-rule-strong)'
    : missing
      ? 'var(--color-severity-upgrade)'
      : 'var(--color-accent)';

  const label = [
    isChoice && !picked ? node.options.map((o) => o.name).join(' or ') : option.name,
    node.maxRank > 1 ? `rank ${rank} of ${node.maxRank}` : picked ? 'picked' : 'not picked',
    missing ? 'not in your current build' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const trigger = (
    <button
      type="button"
      style={{ ...style, aspectRatio: '1' }}
      aria-label={label}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-default rounded-[18%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-sunken"
    >
      <span className={cn('absolute inset-0 block', shape.className)} style={{ ...shape.style, background: ring }}>
        <span
          className={cn('absolute inset-[2px] block overflow-hidden bg-sunken', shape.className)}
          style={shape.style}
        >
          {isChoice && !picked ? (
            // An unpicked choice shows both options, split down the middle,
            // so you can see what the node offers without hovering it.
            <span className="flex h-full w-full">
              {node.options.slice(0, 2).map((o) => (
                <span key={o.talentId} className="h-full w-1/2 overflow-hidden">
                  <span className="block h-full w-[200%]" style={{ marginLeft: o === node.options[0] ? 0 : '-100%' }}>
                    <Icon option={o} dim />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <Icon option={option} dim={!picked} />
          )}
        </span>
      </span>
      {picked && node.maxRank > 1 && (
        <span
          className={cn(
            'figure absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-[3px] border px-1 text-[10px] font-semibold leading-[14px]',
            full ? 'border-accent bg-sunken text-accent' : 'border-rule-strong bg-sunken text-text-muted',
          )}
          aria-hidden="true"
        >
          {rank}/{node.maxRank}
        </span>
      )}
      {missing && (
        <span
          className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-severity-upgrade text-[10px] font-bold leading-none text-bg"
          aria-hidden="true"
        >
          +
        </span>
      )}
    </button>
  );

  return (
    <Tooltip trigger={trigger}>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-semibold text-text">{option.name}</span>
          {node.maxRank > 1 && (
            <span className="figure text-xs text-text-dim">
              Rank {rank}/{node.maxRank}
            </span>
          )}
        </div>
        {isChoice && (
          <div className="text-xs text-text-dim">
            Choice node:{' '}
            {node.options.map((o, i) => (
              <span key={o.talentId}>
                {i > 0 && ' / '}
                <span className={picked && o === option ? 'text-text' : undefined}>{o.name}</span>
              </span>
            ))}
          </div>
        )}
        {option.description && <div className="text-xs leading-relaxed text-text-muted">{option.description}</div>}
        {missing && <div className="text-xs font-medium text-severity-upgrade">Not in your current build</div>}
      </div>
    </Tooltip>
  );
}
