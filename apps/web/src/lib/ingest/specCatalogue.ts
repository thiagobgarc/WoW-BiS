/**
 * Every playable spec, with the one input Blizzard's API does not publish.
 *
 * This table is hand-maintained and therefore drifts. It already did: it was
 * written with 39 specs and missed Demon Hunter Devourer (spec 1480), which
 * Midnight added — the meta tier lists knew about it and this file did not,
 * so that spec silently got no BiS list. `verifyCatalogue` in runIngest.ts now
 * cross-checks it against /data/wow/playable-specialization on every ingest
 * so the next addition fails loudly instead.
 *
 * Everything else this pipeline needs — loot tables, item stats, armor class,
 * primary stat, set membership — comes from Blizzard. Stat priority does not:
 * it is sim output (theorycraft), and there is no endpoint for it. So it lives
 * here as a small, stable, hand-maintained table. That is a deliberate trade:
 * 39 rows of four ordered stats, versus 39 hand-authored gear lists that go
 * stale every tuning patch.
 *
 * `provenance` is not decoration — the coverage report reads it, so a derived
 * list never implies more authority than its inputs have:
 *   - 'curated'  carried over verbatim from the hand-authored seed files that
 *                predate this pipeline, which were researched per spec.
 *   - 'default'  a reasonable role/spec-shaped starting point that has NOT
 *                been verified against sims. Lists derived from these are
 *                directionally right (correct armor, correct primary stat,
 *                real items from the real loot table) but their secondary
 *                ordering wants a theorycrafter's eye before anyone treats
 *                it as gospel.
 */
import type { ArmorType, StatPriority } from '@mythos/core/bis';

export type Role = 'tank' | 'healer' | 'dps';
export type PrimaryStat = 'strength' | 'agility' | 'intellect';

export interface SpecProfile {
  class: string;
  spec: string;
  role: Role;
  armorType: ArmorType;
  primaryStat: PrimaryStat;
  statPriority: StatPriority;
  provenance: 'curated' | 'default';
}

/** Slug used by the seed files and by seasonConfig's tierSets table. */
export function specSlug(className: string, specName: string): string {
  return `${className}-${specName}`.toLowerCase().replace(/\s+/g, '-');
}

const C = 'curated' as const;
const D = 'default' as const;

export const SPEC_CATALOGUE: SpecProfile[] = [
  { class: 'Death Knight', spec: 'Blood', role: 'tank', armorType: 'plate', primaryStat: 'strength', statPriority: ['haste', 'versatility', 'mastery', 'crit'], provenance: D },
  { class: 'Death Knight', spec: 'Frost', role: 'dps', armorType: 'plate', primaryStat: 'strength', statPriority: ['crit', 'mastery', 'haste', 'versatility'], provenance: C },
  { class: 'Death Knight', spec: 'Unholy', role: 'dps', armorType: 'plate', primaryStat: 'strength', statPriority: ['haste', 'mastery', 'crit', 'versatility'], provenance: D },

  { class: 'Demon Hunter', spec: 'Devourer', role: 'dps', armorType: 'leather', primaryStat: 'agility', statPriority: ['mastery', 'crit', 'haste', 'versatility'], provenance: D },
  { class: 'Demon Hunter', spec: 'Havoc', role: 'dps', armorType: 'leather', primaryStat: 'agility', statPriority: ['crit', 'haste', 'mastery', 'versatility'], provenance: D },
  { class: 'Demon Hunter', spec: 'Vengeance', role: 'tank', armorType: 'leather', primaryStat: 'agility', statPriority: ['versatility', 'haste', 'mastery', 'crit'], provenance: D },

  { class: 'Druid', spec: 'Balance', role: 'dps', armorType: 'leather', primaryStat: 'intellect', statPriority: ['mastery', 'haste', 'crit', 'versatility'], provenance: D },
  { class: 'Druid', spec: 'Feral', role: 'dps', armorType: 'leather', primaryStat: 'agility', statPriority: ['crit', 'mastery', 'haste', 'versatility'], provenance: D },
  { class: 'Druid', spec: 'Guardian', role: 'tank', armorType: 'leather', primaryStat: 'agility', statPriority: ['versatility', 'mastery', 'haste', 'crit'], provenance: D },
  { class: 'Druid', spec: 'Restoration', role: 'healer', armorType: 'leather', primaryStat: 'intellect', statPriority: ['haste', 'mastery', 'versatility', 'crit'], provenance: C },

  { class: 'Evoker', spec: 'Devastation', role: 'dps', armorType: 'mail', primaryStat: 'intellect', statPriority: ['mastery', 'crit', 'haste', 'versatility'], provenance: D },
  { class: 'Evoker', spec: 'Preservation', role: 'healer', armorType: 'mail', primaryStat: 'intellect', statPriority: ['mastery', 'versatility', 'crit', 'haste'], provenance: D },
  { class: 'Evoker', spec: 'Augmentation', role: 'dps', armorType: 'mail', primaryStat: 'intellect', statPriority: ['mastery', 'crit', 'versatility', 'haste'], provenance: D },

  { class: 'Hunter', spec: 'Beast Mastery', role: 'dps', armorType: 'mail', primaryStat: 'agility', statPriority: ['mastery', 'crit', 'haste', 'versatility'], provenance: C },
  { class: 'Hunter', spec: 'Marksmanship', role: 'dps', armorType: 'mail', primaryStat: 'agility', statPriority: ['crit', 'mastery', 'haste', 'versatility'], provenance: D },
  { class: 'Hunter', spec: 'Survival', role: 'dps', armorType: 'mail', primaryStat: 'agility', statPriority: ['crit', 'versatility', 'haste', 'mastery'], provenance: D },

  { class: 'Mage', spec: 'Arcane', role: 'dps', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['mastery', 'crit', 'haste', 'versatility'], provenance: D },
  { class: 'Mage', spec: 'Fire', role: 'dps', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['haste', 'mastery', 'versatility', 'crit'], provenance: C },
  { class: 'Mage', spec: 'Frost', role: 'dps', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['crit', 'haste', 'mastery', 'versatility'], provenance: D },

  { class: 'Monk', spec: 'Brewmaster', role: 'tank', armorType: 'leather', primaryStat: 'agility', statPriority: ['versatility', 'mastery', 'crit', 'haste'], provenance: D },
  { class: 'Monk', spec: 'Mistweaver', role: 'healer', armorType: 'leather', primaryStat: 'intellect', statPriority: ['crit', 'haste', 'versatility', 'mastery'], provenance: D },
  { class: 'Monk', spec: 'Windwalker', role: 'dps', armorType: 'leather', primaryStat: 'agility', statPriority: ['versatility', 'crit', 'haste', 'mastery'], provenance: D },

  { class: 'Paladin', spec: 'Holy', role: 'healer', armorType: 'plate', primaryStat: 'intellect', statPriority: ['haste', 'crit', 'mastery', 'versatility'], provenance: D },
  { class: 'Paladin', spec: 'Protection', role: 'tank', armorType: 'plate', primaryStat: 'strength', statPriority: ['haste', 'versatility', 'mastery', 'crit'], provenance: D },
  { class: 'Paladin', spec: 'Retribution', role: 'dps', armorType: 'plate', primaryStat: 'strength', statPriority: ['mastery', 'haste', 'crit', 'versatility'], provenance: C },

  { class: 'Priest', spec: 'Discipline', role: 'healer', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['haste', 'mastery', 'crit', 'versatility'], provenance: C },
  { class: 'Priest', spec: 'Holy', role: 'healer', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['mastery', 'crit', 'haste', 'versatility'], provenance: D },
  { class: 'Priest', spec: 'Shadow', role: 'dps', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['haste', 'mastery', 'crit', 'versatility'], provenance: D },

  { class: 'Rogue', spec: 'Assassination', role: 'dps', armorType: 'leather', primaryStat: 'agility', statPriority: ['crit', 'mastery', 'haste', 'versatility'], provenance: D },
  { class: 'Rogue', spec: 'Outlaw', role: 'dps', armorType: 'leather', primaryStat: 'agility', statPriority: ['haste', 'versatility', 'crit', 'mastery'], provenance: D },
  { class: 'Rogue', spec: 'Subtlety', role: 'dps', armorType: 'leather', primaryStat: 'agility', statPriority: ['mastery', 'crit', 'haste', 'versatility'], provenance: D },

  { class: 'Shaman', spec: 'Elemental', role: 'dps', armorType: 'mail', primaryStat: 'intellect', statPriority: ['haste', 'mastery', 'crit', 'versatility'], provenance: D },
  { class: 'Shaman', spec: 'Enhancement', role: 'dps', armorType: 'mail', primaryStat: 'agility', statPriority: ['haste', 'mastery', 'crit', 'versatility'], provenance: D },
  { class: 'Shaman', spec: 'Restoration', role: 'healer', armorType: 'mail', primaryStat: 'intellect', statPriority: ['crit', 'haste', 'versatility', 'mastery'], provenance: D },

  { class: 'Warlock', spec: 'Affliction', role: 'dps', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['mastery', 'haste', 'crit', 'versatility'], provenance: D },
  { class: 'Warlock', spec: 'Demonology', role: 'dps', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['haste', 'crit', 'mastery', 'versatility'], provenance: D },
  { class: 'Warlock', spec: 'Destruction', role: 'dps', armorType: 'cloth', primaryStat: 'intellect', statPriority: ['haste', 'mastery', 'crit', 'versatility'], provenance: D },

  { class: 'Warrior', spec: 'Arms', role: 'dps', armorType: 'plate', primaryStat: 'strength', statPriority: ['crit', 'haste', 'mastery', 'versatility'], provenance: D },
  { class: 'Warrior', spec: 'Fury', role: 'dps', armorType: 'plate', primaryStat: 'strength', statPriority: ['haste', 'mastery', 'crit', 'versatility'], provenance: D },
  { class: 'Warrior', spec: 'Protection', role: 'tank', armorType: 'plate', primaryStat: 'strength', statPriority: ['haste', 'versatility', 'mastery', 'crit'], provenance: D },
];

export function findSpec(className: string, specName: string): SpecProfile | null {
  const slug = specSlug(className, specName);
  return SPEC_CATALOGUE.find((s) => specSlug(s.class, s.spec) === slug) ?? null;
}
