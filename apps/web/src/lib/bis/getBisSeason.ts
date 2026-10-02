/**
 * Whole-season BiS data, for the /v1 endpoints that describe the season
 * rather than one character: GET /v1/bis/:season (offline prefetch) and
 * GET /v1/meta's seededSpecs list.
 *
 * Mirrors getBisList.ts's dual path exactly — Postgres when DATABASE_URL is
 * configured, seed JSON otherwise — so the API can't disagree with the web
 * app's character page about what's seeded depending on which one you ask.
 */
import { eq } from 'drizzle-orm';
import type { BisSpec } from '@mythos/api-contract';
import type { BisEntry, BisList } from '@mythos/core/bis';
import { getDb } from '@/lib/db/client';
import { bisEntries, bisLists } from '@/lib/db/schema';
import { loadAllSeeds } from './loadSeeds';

/**
 * Sorted by class then spec so the content hash in /v1/bis/:season's
 * `version` is stable: readdir order and Postgres row order are both
 * incidental, and a version that changed on every deploy would defeat the
 * conditional-GET it exists for.
 */
function sorted(specs: BisSpec[]): BisSpec[] {
  return [...specs].sort((a, b) => a.class.localeCompare(b.class) || a.spec.localeCompare(b.spec));
}

export async function getBisSeason(season: string): Promise<BisSpec[]> {
  if (process.env.DATABASE_URL) {
    return sorted(await getBisSeasonFromDb(season));
  }
  return sorted(await getBisSeasonFromSeed(season));
}

async function getBisSeasonFromSeed(season: string): Promise<BisSpec[]> {
  const lists = await loadAllSeeds(season);
  return lists.map((list) => ({
    class: list.class,
    spec: list.spec,
    armorType: list.armorType,
    statPriority: list.statPriority,
    entries: list.entries,
  }));
}

async function getBisSeasonFromDb(season: string): Promise<BisSpec[]> {
  const db = getDb();
  const lists = await db.select().from(bisLists).where(eq(bisLists.season, season));

  return Promise.all(
    lists.map(async (list) => {
      const entries = await db.select().from(bisEntries).where(eq(bisEntries.bisListId, list.id));
      return {
        class: list.class,
        spec: list.spec,
        armorType: list.armorType as BisList['armorType'],
        statPriority: list.statPriority as BisList['statPriority'],
        entries: entries.map(
          (e): BisEntry => ({
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
          }),
        ),
      };
    }),
  );
}
