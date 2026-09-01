/**
 * Pure, I/O-free comparison engine. No fetch, no DB, no cache — just data
 * in, data out, so it's trivially unit-testable (see compareGear.test.ts).
 *
 * Rings and trinkets are the tricky part: `bisList` carries them as a
 * ranked pool per generic slot ('finger' / 'trinket'), not per physical
 * slot. Rank 1 + rank 2 together are the target *pair* for that category.
 * We solve the tiny 2x2 assignment problem (only 2 possible pairings) so
 * a player holding BiS rank 2 in finger_1 is credited there, instead of
 * both ring slots naively being told they're missing rank 1.
 */
import type { EquipmentBySlot, EquipmentSlot, DomainItem } from '@/lib/blizzard/domain';
import { DUAL_SLOT_CATEGORIES, type BisEntry, type BisSlot, type ContentType, type Source } from './types';

export type Severity = 'bis' | 'close' | 'upgrade' | 'major-gap';

const CLOSE_ILVL_THRESHOLD = 7;
const MAJOR_GAP_ILVL_THRESHOLD = 20;

export interface Target {
  rank: number;
  itemId: number;
  itemName: string;
  itemLevel: number;
  source: Source;
  tierPiece: boolean;
  catalystable: boolean;
}

export interface ComparisonRow {
  bisSlot: BisSlot;
  physicalSlot: EquipmentSlot;
  equipped: DomainItem | null;
  target: Target | null;
  alternatives: Target[];
  severity: Severity;
  ilvlDelta: number;
  isMatch: boolean;
}

export interface CompareGearResult {
  rows: ComparisonRow[];
  bisSlotsCount: number;
  totalSlots: number;
  theoreticalMaxIlvl: number;
  currentIlvl: number;
}

function toTarget(entry: BisEntry): Target {
  return {
    rank: entry.rank,
    itemId: entry.itemId,
    itemName: entry.itemName,
    itemLevel: entry.itemLevel,
    source: entry.source,
    tierPiece: entry.tierPiece,
    catalystable: entry.catalystable,
  };
}

export function severityFor(equipped: DomainItem | null, target: Target | null): { severity: Severity; delta: number } {
  if (!target) return { severity: 'bis', delta: 0 };
  if (!equipped) return { severity: 'major-gap', delta: target.itemLevel };
  if (equipped.itemId === target.itemId) return { severity: 'bis', delta: 0 };

  const delta = target.itemLevel - equipped.itemLevel;
  if (delta <= 0) return { severity: 'close', delta };
  if (delta <= CLOSE_ILVL_THRESHOLD) return { severity: 'close', delta };
  if (delta <= MAJOR_GAP_ILVL_THRESHOLD) return { severity: 'upgrade', delta };
  return { severity: 'major-gap', delta };
}

function buildRow(bisSlot: BisSlot, physicalSlot: EquipmentSlot, equipped: DomainItem | null, target: Target | null, alternatives: Target[]): ComparisonRow {
  const { severity, delta } = severityFor(equipped, target);
  return {
    bisSlot,
    physicalSlot,
    equipped,
    target,
    alternatives,
    severity,
    ilvlDelta: delta,
    isMatch: Boolean(equipped && target && equipped.itemId === target.itemId),
  };
}

/**
 * Cost to assign `equipped` to `target`. An exact item match is scored far
 * below any ilvl-gap cost so the assignment always prefers pairing an
 * exact match over a same-or-better-ilvl-but-different-item coincidence —
 * without this, two pairings can tie on ilvl gap alone (e.g. a non-BiS
 * item that happens to match a target's ilvl), and the tie-break would
 * silently prefer the wrong pairing.
 */
function assignmentCost(equipped: DomainItem | null, target: Target): number {
  if (equipped && equipped.itemId === target.itemId) return -1_000_000;
  if (!equipped) return target.itemLevel;
  return Math.max(0, target.itemLevel - equipped.itemLevel);
}

/**
 * Solves the 2-item assignment problem for a dual-slot category (rings,
 * trinkets). `equipped` and `targets` can each be length 0, 1, or 2;
 * returns one target-or-null per equipped slot, assigned to minimize
 * total cost. With at most 2 elements a side, brute-forcing both possible
 * pairings is simpler and just as correct as a general Hungarian solver.
 */
function assignDualSlot(equipped: (DomainItem | null)[], targets: Target[]): (Target | null)[] {
  const padded = [targets[0] ?? null, targets[1] ?? null];

  if (!padded[0] || !padded[1]) {
    // 0 or 1 known target — nothing to permute, assign in order.
    return equipped.map((_, i) => padded[i] ?? null);
  }

  const identityCost = assignmentCost(equipped[0] ?? null, padded[0]) + assignmentCost(equipped[1] ?? null, padded[1]);
  const swappedCost = assignmentCost(equipped[0] ?? null, padded[1]) + assignmentCost(equipped[1] ?? null, padded[0]);

  return swappedCost < identityCost ? [padded[1], padded[0]] : [padded[0], padded[1]];
}

export function compareGear(equipped: EquipmentBySlot, bisList: BisEntry[], contentType: ContentType): CompareGearResult {
  const forContent = bisList.filter((e) => e.contentType === contentType);
  const rows: ComparisonRow[] = [];

  const bySlot = new Map<BisSlot, BisEntry[]>();
  for (const entry of forContent) {
    const list = bySlot.get(entry.slot) ?? [];
    list.push(entry);
    bySlot.set(entry.slot, list);
  }
  for (const list of bySlot.values()) list.sort((a, b) => a.rank - b.rank);

  for (const [bisSlot, entries] of bySlot) {
    if ((DUAL_SLOT_CATEGORIES as readonly string[]).includes(bisSlot)) {
      const physicalSlots = [`${bisSlot}_1`, `${bisSlot}_2`] as EquipmentSlot[];
      const equippedItems = physicalSlots.map((s) => equipped[s] ?? null);
      const pairTargets = entries.slice(0, 2).map(toTarget);
      const alternatives = entries.slice(2).map(toTarget);
      const assigned = assignDualSlot(equippedItems, pairTargets);

      physicalSlots.forEach((physicalSlot, i) => {
        rows.push(buildRow(bisSlot, physicalSlot, equippedItems[i] ?? null, assigned[i] ?? null, alternatives));
      });
    } else {
      const physicalSlot = bisSlot as EquipmentSlot;
      const [primary, ...alternatives] = entries.map(toTarget);
      rows.push(buildRow(bisSlot, physicalSlot, equipped[physicalSlot] ?? null, primary ?? null, alternatives));
    }
  }

  rows.sort((a, b) => b.ilvlDelta - a.ilvlDelta);

  const bisSlotsCount = rows.filter((r) => r.isMatch).length;
  const theoreticalMaxIlvl = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + (r.target?.itemLevel ?? r.equipped?.itemLevel ?? 0), 0) / rows.length)
    : 0;
  const currentIlvl = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + (r.equipped?.itemLevel ?? 0), 0) / rows.length)
    : 0;

  return { rows, bisSlotsCount, totalSlots: rows.length, theoreticalMaxIlvl, currentIlvl };
}
