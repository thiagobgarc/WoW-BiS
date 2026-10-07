/**
 * Writes src/lib/season/upgradeTracks.json: bonus id -> upgrade track
 * ("Hero", level 6 of 6). Run with `bun run tracks:import`.
 *
 * Blizzard's equipment API has no upgrade-track field. Its name_description
 * is the drop source ("Heroic", "Mythic+", "Timewarped"), and the track
 * ("Hero 6/6") is only encoded in the item's bonus_list. Raidbots'
 * bonuses.json is the public decoding of those ids, the same source
 * import-talents.ts already reads. Re-run when a new season adds tracks;
 * ids from older seasons stay in the file, since they never get reused.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = 'https://www.raidbots.com/static/data/live/bonuses.json';
const OUT = path.join(process.cwd(), 'src', 'lib', 'season', 'upgradeTracks.json');

interface RaidbotsBonus {
  upgrade?: { name?: string; level?: number; max?: number; itemLevel?: number; seasonId?: number };
}

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`${SOURCE} -> HTTP ${res.status}`);
const bonuses = (await res.json()) as Record<string, RaidbotsBonus>;

type Upgrade = Required<Pick<NonNullable<RaidbotsBonus['upgrade']>, 'name' | 'level' | 'max' | 'itemLevel'>> & { seasonId?: number };
const upgrades: [string, Upgrade][] = [];
for (const [id, bonus] of Object.entries(bonuses)) {
  const u = bonus.upgrade;
  // Unnamed groups are legacy/internal upgrade schemes, and "Test" is a PTR one.
  if (!u?.name || u.name === 'Test' || !u.level || !u.max || !u.itemLevel) continue;
  upgrades.push([id, u as Upgrade]);
}

// The season's ceiling: its highest track fully upgraded (Myth 6/6). An item
// below it can still be improved, either with crests or a higher-track copy.
const ceilingBySeason = new Map<number | undefined, number>();
for (const [, u] of upgrades) ceilingBySeason.set(u.seasonId, Math.max(ceilingBySeason.get(u.seasonId) ?? 0, u.itemLevel));

const tracks: Record<string, { track: string; level: number; max: number; seasonMaxItemLevel: number }> = {};
for (const [id, u] of upgrades) {
  tracks[id] = { track: u.name, level: u.level, max: u.max, seasonMaxItemLevel: ceilingBySeason.get(u.seasonId)! };
}

await writeFile(OUT, `${JSON.stringify(tracks)}\n`);
console.log(`Wrote ${upgrades.length} upgrade-track bonus ids to ${path.relative(process.cwd(), OUT)}`);
