/**
 * Maps the human-readable instance names in seasonConfig onto Blizzard's
 * journal instance ids.
 *
 * Name matching is normalised rather than exact, because the two sources
 * genuinely disagree on punctuation: seasonConfig lists the Season 2 dungeon
 * as "King's Rest" while the journal calls it "Kings' Rest". An exact match
 * silently drops that dungeon's entire loot table, which is the worst kind of
 * failure here — a quietly smaller BiS list that still looks complete. So
 * unresolved names are returned, not swallowed, and the CLI treats them as an
 * error rather than a warning.
 */
import { getJournalEncounter, getJournalInstance, getJournalInstanceIndex } from '@/lib/blizzard/client';
import type { JournalEncounter } from '@/lib/blizzard/schemas';
import type { SeasonConfig } from '@/lib/season/seasonConfig';

export interface ResolvedInstance {
  id: number;
  /** The journal's name, which is the authoritative spelling. */
  name: string;
  encounters: JournalEncounter[];
}

export interface ResolvedSeasonContent {
  raid: ResolvedInstance | null;
  dungeons: ResolvedInstance[];
  /** Names from seasonConfig that matched no journal instance. */
  unresolved: string[];
}

/** Lowercase, strip apostrophes (straight and curly) and collapse whitespace. */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadInstance(region: string, id: number, name: string): Promise<ResolvedInstance> {
  const instance = await getJournalInstance(region, id);
  const encounters = await Promise.all(
    (instance.encounters ?? []).map((e) => getJournalEncounter(region, e.id)),
  );
  return { id, name: instance.name ?? name, encounters };
}

export async function resolveSeasonContent(
  region: string,
  config: SeasonConfig,
): Promise<ResolvedSeasonContent> {
  const index = await getJournalInstanceIndex(region);

  // Last-wins is deliberate: Blizzard reuses instance names across expansions
  // (a returning dungeon appears more than once), and the higher id is the
  // current incarnation whose journal carries this season's loot.
  const byName = new Map<string, { id: number; name: string }>();
  for (const instance of index.instances) {
    const key = normaliseName(instance.name);
    const existing = byName.get(key);
    if (!existing || instance.id > existing.id) byName.set(key, instance);
  }

  const unresolved: string[] = [];
  const lookup = (name: string) => {
    const hit = byName.get(normaliseName(name));
    if (!hit) unresolved.push(name);
    return hit ?? null;
  };

  const raidHit = lookup(config.raid.name);
  const dungeonHits = config.mythicPlus.dungeons.map((d) => ({ configName: d, hit: lookup(d) }));

  const raid = raidHit ? await loadInstance(region, raidHit.id, raidHit.name) : null;
  const dungeons = await Promise.all(
    dungeonHits
      .filter((d): d is { configName: string; hit: { id: number; name: string } } => d.hit !== null)
      .map((d) => loadInstance(region, d.hit.id, d.hit.name)),
  );

  return { raid, dungeons, unresolved };
}
