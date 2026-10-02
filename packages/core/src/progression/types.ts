/**
 * Raid + Mythic+ progression domain types, moved out of apps/web's
 * src/lib/blizzard/domain.ts in Phase 3 (deferred from Phase 2 — see
 * docs/architecture.md Section 0's scope note). `GET /v1/character/...`
 * returns these under its `progression` field, so packages/api-contract
 * needs the shapes, and `progression` is a bounded context of its own
 * (architecture.md Section 3) rather than part of `character`.
 *
 * Shapes only: `mapRaidProgress`/`mapMythicPlusProfile`, which build these
 * from Blizzard's raw encounters and mythic-keystone responses, stay in
 * apps/web — same rule as character/types.ts.
 */
import { z } from 'zod';

/**
 * The four modern raid difficulties, in ascending order, with the labels the
 * UI renders. `type` matches Blizzard's `difficulty.type` verbatim so
 * mapRaidProgress can key straight off the raw payload.
 */
export const RAID_DIFFICULTIES = [
  { type: 'LFR', label: 'Raid Finder' },
  { type: 'NORMAL', label: 'Normal' },
  { type: 'HEROIC', label: 'Heroic' },
  { type: 'MYTHIC', label: 'Mythic' },
] as const;

export const RaidDifficultySchema = z.enum(['LFR', 'NORMAL', 'HEROIC', 'MYTHIC']);
export type RaidDifficulty = z.infer<typeof RaidDifficultySchema>;

export const DomainBossKillSchema = z.object({
  name: z.string(),
  killed: z.boolean(),
  killCount: z.number(),
  lastKillTimestamp: z.number().nullable(),
});
export type DomainBossKill = z.infer<typeof DomainBossKillSchema>;

export const DomainRaidDifficultyProgressSchema = z.object({
  difficulty: RaidDifficultySchema,
  label: z.string(),
  killed: z.number(),
  total: z.number(),
  bosses: z.array(DomainBossKillSchema),
});
export type DomainRaidDifficultyProgress = z.infer<typeof DomainRaidDifficultyProgressSchema>;

export const DomainRaidProgressSchema = z.object({
  instanceName: z.string(),
  difficulties: z.array(DomainRaidDifficultyProgressSchema),
});
export type DomainRaidProgress = z.infer<typeof DomainRaidProgressSchema>;

export const DomainMythicPlusRunSchema = z.object({
  level: z.number(),
  timed: z.boolean(),
  score: z.number().nullable(),
  durationMs: z.number(),
  completedAt: z.number(),
});
export type DomainMythicPlusRun = z.infer<typeof DomainMythicPlusRunSchema>;

export const DomainDungeonProgressSchema = z.object({
  dungeon: z.string(),
  /** null when the character has no timed or untimed run of that dungeon this season. */
  run: DomainMythicPlusRunSchema.nullable(),
});
export type DomainDungeonProgress = z.infer<typeof DomainDungeonProgressSchema>;

export const DomainMythicPlusProfileSchema = z.object({
  rating: z.number().nullable(),
  dungeons: z.array(DomainDungeonProgressSchema),
});
export type DomainMythicPlusProfile = z.infer<typeof DomainMythicPlusProfileSchema>;
