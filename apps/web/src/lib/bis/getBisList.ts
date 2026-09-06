/**
 * Single entry point the upgrade board (Phase 4) uses to fetch a spec's
 * BiS entries. Reads from Postgres when DATABASE_URL is configured
 * (the production path — see scripts/seed.ts for populating it), and
 * falls back to reading the seed JSON directly otherwise, so the upgrade
 * board works with zero infra just like the rest of the app.
 */
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bisEntries, bisLists } from '@/lib/db/schema';
import { loadSeedFile } from './loadSeeds';
import type { BisEntry, BisList } from './types';

export interface BisResult {
  entries: BisEntry[];
  statPriority: BisList['statPriority'];
  armorType: BisList['armorType'];
  seeded: boolean;
}

const NOT_SEEDED: BisResult = { entries: [], statPriority: ['haste', 'crit', 'versatility', 'mastery'], armorType: 'cloth', seeded: false };

export async function getBisList(season: string, className: string, specName: string): Promise<BisResult> {
  if (process.env.DATABASE_URL) {
    return getBisListFromDb(season, className, specName);
  }
  return getBisListFromSeed(season, className, specName);
}

async function getBisListFromSeed(season: string, className: string, specName: string): Promise<BisResult> {
  const list = await loadSeedFile(season, className, specName);
  if (!list) return NOT_SEEDED;
  return { entries: list.entries, statPriority: list.statPriority, armorType: list.armorType, seeded: true };
}

async function getBisListFromDb(season: string, className: string, specName: string): Promise<BisResult> {
  const db = getDb();
  const list = await db.query.bisLists.findFirst({
    where: and(eq(bisLists.season, season), eq(bisLists.class, className), eq(bisLists.spec, specName)),
  });
  if (!list) return NOT_SEEDED;

  const entries = await db.select().from(bisEntries).where(eq(bisEntries.bisListId, list.id));

  return {
    seeded: true,
    armorType: list.armorType as BisList['armorType'],
    statPriority: list.statPriority as BisList['statPriority'],
    entries: entries.map((e) => ({
      slot: e.slot as BisEntry['slot'],
      contentType: e.contentType as BisEntry['contentType'],
      rank: e.rank,
      itemId: e.itemId,
      itemName: e.itemName,
      itemLevel: e.itemLevel,
      source: e.source,
      tierPiece: e.tierPiece,
      catalystable: e.catalystable,
      statPriorityFit: e.statPriorityFit,
      notes: e.notes ?? undefined,
    })),
  };
}
