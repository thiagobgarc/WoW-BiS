/**
 * Populates Postgres from the versioned JSON seed files in /data/bis.
 * Run with `bun run db:seed` (requires DATABASE_URL and migrations applied
 * — run `bun run db:generate && bun run db:migrate` first).
 */
import { eq, and } from 'drizzle-orm';
import { getDb } from '../src/lib/db/client';
import { bisEntries, bisLists } from '../src/lib/db/schema';
import { loadAllSeeds } from '../src/lib/bis/loadSeeds';
import { CURRENT_SEASON_ID } from '../src/lib/season/seasonConfig';

async function main() {
  const db = getDb();
  const seasons = [CURRENT_SEASON_ID];

  for (const season of seasons) {
    const lists = await loadAllSeeds(season);
    if (lists.length === 0) {
      console.warn(`No seed files found for season "${season}" in /data/bis/${season}`);
      continue;
    }

    for (const list of lists) {
      const existing = await db.query.bisLists.findFirst({
        where: and(eq(bisLists.season, list.season), eq(bisLists.class, list.class), eq(bisLists.spec, list.spec)),
      });

      const listId = existing
        ? existing.id
        : (
            await db
              .insert(bisLists)
              .values({ season: list.season, class: list.class, spec: list.spec, armorType: list.armorType, statPriority: list.statPriority })
              .returning({ id: bisLists.id })
          )[0]!.id;

      if (existing) {
        await db.update(bisLists).set({ armorType: list.armorType, statPriority: list.statPriority }).where(eq(bisLists.id, listId));
        await db.delete(bisEntries).where(eq(bisEntries.bisListId, listId));
      }

      await db.insert(bisEntries).values(
        list.entries.map((e) => ({
          bisListId: listId,
          slot: e.slot,
          contentType: e.contentType,
          rank: e.rank,
          itemId: e.itemId,
          itemName: e.itemName,
          itemLevel: e.itemLevel,
          source: e.source,
          tierPiece: e.tierPiece,
          catalystable: e.catalystable,
          statPriorityFit: e.statPriorityFit,
          notes: e.notes,
        })),
      );

      console.log(`Seeded ${list.class} - ${list.spec} (${list.entries.length} entries)`);
    }
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
