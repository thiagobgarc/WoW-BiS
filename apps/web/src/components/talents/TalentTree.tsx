import { TalentNode, type NodeSelection } from './TalentNode';
import type { DomainTalentNode } from '@/lib/blizzard/domain';

interface Props {
  nodes: DomainTalentNode[];
  selections: Map<number, NodeSelection>;
  title: string;
  /** Recommended view only: picks the character doesn't have yet. */
  missing?: Set<number>;
}

/** The largest a grid cell gets, in px. Below that the tree scales with its
 *  container, so all three trees share one row without scrolling. */
const MAX_CELL = 52;
/** Node size as a share of its cell; the rest is the gap edges run through. */
const NODE_RATIO = 0.76;

/**
 * The shared panel trees sit in. From lg up they share one row, in the
 * in-game order (class, hero, spec), and scale together to fit it. Below lg
 * there isn't room for three legible trees across, so they stack, each at
 * its own full size.
 */
export function TalentTreePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border border-rule bg-sunken px-4 py-5 sm:px-6">
      <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
        {children}
      </div>
    </div>
  );
}

export function TalentTree({ nodes, selections, title, missing }: Props) {
  // Option-less nodes are structural (the top-of-tree spec/hero selector).
  // They carry nothing to show, and they sit outside the real grid, so
  // counting them in the bounds left an empty row and column on every tree.
  const withOptions = nodes.filter((n) => n.options.length > 0);
  if (withOptions.length === 0) return null;

  // Some classes ship spec variants of one talent as separate nodes on the
  // same grid cell (Druid's Starfire and Moonkin Form, Paladin's Lightforged
  // Blessing), with nothing in the data saying which spec gets which. Show
  // one per cell — the picked one if either is — and re-point the other's
  // edges at it, so the tree draws no stacked icons and no dangling lines.
  const byCell = new Map<string, DomainTalentNode[]>();
  for (const n of withOptions) {
    const cell = `${n.row},${n.col}`;
    byCell.set(cell, [...(byCell.get(cell) ?? []), n]);
  }
  const alias = new Map<number, number>();
  const real = [...byCell.values()].map((group) => {
    const kept = group.find((n) => selections.has(n.id)) ?? group[0]!;
    for (const n of group) if (n !== kept) alias.set(n.id, kept.id);
    return kept;
  });
  const resolve = (id: number) => alias.get(id) ?? id;

  // Blizzard's row/col values are positions in the *shared* combined-tree
  // grid (a spec tree's columns commonly start around 9, a hero sub-tree's
  // around 20+), so re-base each tree to its own min row/col.
  const minCol = Math.min(...real.map((n) => n.col));
  const minRow = Math.min(...real.map((n) => n.row));
  const cols = Math.max(...real.map((n) => n.col)) - minCol + 1;
  const rows = Math.max(...real.map((n) => n.row)) - minRow + 1;

  // Everything below is in cell units: the SVG's viewBox is the grid itself,
  // and nodes are placed by percentage, so the tree scales as one piece.
  const at = (n: DomainTalentNode) => ({ x: n.col - minCol + 0.5, y: n.row - minRow + 0.5 });

  const byId = new Map(real.map((n) => [n.id, n]));
  // Prerequisites come from every node in a cell, kept or not, so a dropped
  // variant's own links still show; the key de-duplicates the overlap.
  const edgeMap = new Map<string, { key: string; from: { x: number; y: number }; to: { x: number; y: number }; active: boolean }>();
  for (const node of withOptions) {
    const to = byId.get(resolve(node.id))!;
    for (const prereqId of node.prerequisiteIds) {
      const prereq = byId.get(resolve(prereqId));
      if (!prereq || prereq === to) continue;
      const key = `${prereq.id}-${to.id}`;
      edgeMap.set(key, { key, from: at(prereq), to: at(to), active: selections.has(prereq.id) && selections.has(to.id) });
    }
  }
  const edges = [...edgeMap.values()];

  const spent = real.reduce((sum, n) => sum + (selections.get(n.id)?.rank ?? 0), 0);

  return (
    // flex-grow by column count, so side by side each tree gets the width its
    // grid needs and every tree ends up with the same cell size.
    <section className="w-full min-w-0" style={{ flex: `${cols} 1 0%`, maxWidth: cols * MAX_CELL }}>
      <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-rule pb-2">
        <h3 className="label">{title}</h3>
        <span className="figure text-xs text-text-muted">
          {spent} {spent === 1 ? 'point' : 'points'}
        </span>
      </header>
      <div className="relative w-full" style={{ aspectRatio: `${cols} / ${rows}` }}>
        <svg
          viewBox={`0 0 ${cols} ${rows}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Inactive edges first, so active paths are never painted over. */}
          {[...edges]
            .sort((a, b) => Number(a.active) - Number(b.active))
            .map((e) => (
              <line
                key={e.key}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke={e.active ? 'var(--color-accent)' : 'var(--color-rule-strong)'}
                strokeWidth={e.active ? 2 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>
        {real.map((node) => {
          const c = at(node);
          return (
            <TalentNode
              key={node.id}
              node={node}
              selection={selections.get(node.id) ?? null}
              missing={missing?.has(node.id) ?? false}
              style={{
                left: `${(c.x / cols) * 100}%`,
                top: `${(c.y / rows) * 100}%`,
                width: `${(NODE_RATIO / cols) * 100}%`,
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
