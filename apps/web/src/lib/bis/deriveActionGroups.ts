/**
 * Pure derivation of the upgrade board's "actionable groupings" from a
 * compareGear() result plus the equipped gear. No I/O — testable the same
 * way as compareGear itself.
 */
import type { EquipmentBySlot, EquipmentSlot } from '@/lib/blizzard/domain';
import type { ComparisonRow } from './compareGear';
import { seasonConfig } from '@/lib/season/seasonConfig';
import { slotLabel } from '@/lib/utils/format';

export interface BossTarget {
  boss: string;
  instance: string;
  difficulty?: string;
  slots: string[];
}

export interface DungeonTarget {
  dungeon: string;
  slots: string[];
}

export interface CraftTarget {
  slot: string;
  itemName: string;
  craftQuality?: number;
}

export interface CatalystTarget {
  slot: string;
  itemName: string;
}

export interface QuickWin {
  type: 'enchant' | 'socket' | 'embellishment';
  slot: string;
  label: string;
}

export interface ActionGroups {
  raidTargets: BossTarget[];
  dungeonTargets: DungeonTarget[];
  craftTargets: CraftTarget[];
  catalystTargets: CatalystTarget[];
  quickWins: QuickWin[];
}

export function deriveActionGroups(rows: ComparisonRow[], equipment: EquipmentBySlot): ActionGroups {
  const actionable = rows.filter((r) => r.severity !== 'bis' && r.target);

  const bossMap = new Map<string, BossTarget>();
  const dungeonMap = new Map<string, DungeonTarget>();
  const craftTargets: CraftTarget[] = [];
  const catalystTargets: CatalystTarget[] = [];

  for (const row of actionable) {
    const source = row.target!.source;
    const slot = slotLabel(row.physicalSlot);

    if (source.type === 'raid' && source.boss) {
      const key = `${source.boss}|${source.instance ?? ''}|${source.difficulty ?? ''}`;
      const existing = bossMap.get(key);
      if (existing) existing.slots.push(slot);
      else bossMap.set(key, { boss: source.boss, instance: source.instance ?? '', difficulty: source.difficulty, slots: [slot] });
    } else if (source.type === 'dungeon' && source.dungeon) {
      const existing = dungeonMap.get(source.dungeon);
      if (existing) existing.slots.push(slot);
      else dungeonMap.set(source.dungeon, { dungeon: source.dungeon, slots: [slot] });
    } else if (source.type === 'crafted') {
      craftTargets.push({ slot, itemName: row.target!.itemName, craftQuality: source.craftQuality });
    } else if (source.type === 'catalyst') {
      catalystTargets.push({ slot, itemName: row.target!.itemName });
    }
  }

  const quickWins: QuickWin[] = [];
  for (const slot of seasonConfig.enchantableSlots) {
    const item = equipment[slot as EquipmentSlot];
    if (item && !item.enchantText) {
      quickWins.push({ type: 'enchant', slot: slotLabel(slot), label: `Add an enchant to ${slotLabel(slot)} (free ilvl-equivalent power)` });
    }
  }
  for (const [slot, item] of Object.entries(equipment) as [EquipmentSlot, NonNullable<EquipmentBySlot[EquipmentSlot]>][]) {
    const emptySockets = item.sockets.filter((s) => !s.filled).length;
    if (emptySockets > 0) {
      quickWins.push({ type: 'socket', slot: slotLabel(slot), label: `Socket ${slotLabel(slot)} (${emptySockets} empty socket${emptySockets > 1 ? 's' : ''})` });
    }
  }
  for (const slot of seasonConfig.embellishableSlots) {
    const item = equipment[slot as EquipmentSlot];
    if (item && !item.isEmbellishment) {
      quickWins.push({ type: 'embellishment', slot: slotLabel(slot), label: `Add an Embellishment to ${slotLabel(slot)}` });
    }
  }

  const sortByCountDesc = <T extends { slots: string[] }>(list: T[]) => [...list].sort((a, b) => b.slots.length - a.slots.length);

  return {
    raidTargets: sortByCountDesc([...bossMap.values()]),
    dungeonTargets: sortByCountDesc([...dungeonMap.values()]),
    craftTargets,
    catalystTargets,
    quickWins,
  };
}
