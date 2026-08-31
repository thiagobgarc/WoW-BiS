import { TalentNode } from './TalentNode';
import type { DomainTalentNode } from '@/lib/blizzard/domain';

interface Selection {
  rank: number;
  optionIndex: number;
}

interface Props {
  nodes: DomainTalentNode[];
  selections: Map<number, Selection>;
  title: string;
  /** Rendered next to the title — used for the hero-spec portrait badge. */
  badge?: React.ReactNode;
}

// Sized to let all three trees (class/hero/spec) sit side by side without
// scrolling on a typical desktop viewport — Blizzard's own reference tools
// use similarly dense, small nodes for the same reason.
const CELL = 24;
const NODE = 17;
const PAD = 6;

// Blizzard's row/col values are positions in the *shared* combined-tree grid
// (e.g. a spec tree's columns commonly start around 9, not 1, and a hero
// sub-tree's around 20+) — rendering them as-is produces a huge mostly-empty
// box with the real nodes crammed into one corner. Re-base each tree to its
// own min row/col so it lays out tightly regardless of where it sits in the
// original combined grid.
function centerOf(node: DomainTalentNode, minCol: number, minRow: number) {
  return { x: PAD + (node.col - minCol) * CELL + NODE / 2, y: PAD + (node.row - minRow) * CELL + NODE / 2 };
}

export function TalentTree({ nodes, selections, title, badge }: Props) {
  if (nodes.length === 0) return null;

  const minCol = Math.min(...nodes.map((n) => n.col));
  const minRow = Math.min(...nodes.map((n) => n.row));
  const maxCol = Math.max(...nodes.map((n) => n.col));
  const maxRow = Math.max(...nodes.map((n) => n.row));
  const width = (maxCol - minCol + 1) * CELL + PAD * 2;
  const height = (maxRow - minRow + 1) * CELL + PAD * 2;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges: { x1: number; y1: number; x2: number; y2: number; active: boolean; key: string }[] = [];
  for (const node of nodes) {
    const to = centerOf(node, minCol, minRow);
    for (const prereqId of node.prerequisiteIds) {
      const prereq = byId.get(prereqId);
      if (!prereq) continue;
      const from = centerOf(prereq, minCol, minRow);
      edges.push({
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        active: selections.has(prereqId) && selections.has(node.id),
        key: `${prereqId}-${node.id}`,
      });
    }
  }

  return (
    <div className="min-w-0 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        {badge}
        <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wide">{title}</h3>
      </div>
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {edges.map((e) => (
            <line
              key={e.key}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.active ? 'var(--color-accent)' : 'rgba(255,255,255,0.16)'}
              strokeWidth={e.active ? 2 : 1}
            />
          ))}
        </svg>
        {nodes.map((node) => {
          const c = centerOf(node, minCol, minRow);
          return (
            <TalentNode
              key={node.id}
              node={node}
              selection={selections.get(node.id) ?? null}
              style={{ left: c.x - NODE / 2, top: c.y - NODE / 2, width: NODE, height: NODE }}
            />
          );
        })}
      </div>
    </div>
  );
}
