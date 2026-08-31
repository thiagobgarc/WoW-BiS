/**
 * Reads and validates the versioned BiS seed JSON files from /data/bis.
 * Used by the seed script (scripts/seed.ts) to populate Postgres, and as
 * a zero-infra fallback (see getBisList.ts) so the upgrade board works
 * before DATABASE_URL is configured.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { BisListSchema, type BisList } from './types';

const DATA_ROOT = path.join(process.cwd(), 'data', 'bis');

export function specSlug(className: string, specName: string): string {
  return `${className.toLowerCase().replace(/\s+/g, '-')}-${specName.toLowerCase().replace(/\s+/g, '-')}`;
}

export async function loadSeedFile(season: string, className: string, specName: string): Promise<BisList | null> {
  const filePath = path.join(DATA_ROOT, season, `${specSlug(className, specName)}.json`);
  try {
    const raw = await readFile(filePath, 'utf-8');
    return BisListSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Invalid BiS seed file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function loadAllSeeds(season: string): Promise<BisList[]> {
  const seasonDir = path.join(DATA_ROOT, season);
  let files: string[];
  try {
    files = await readdir(seasonDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const lists: BisList[] = [];
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    const raw = await readFile(path.join(seasonDir, file), 'utf-8');
    lists.push(BisListSchema.parse(JSON.parse(raw)));
  }
  return lists;
}

/** Which specs currently have seed data, for surfacing "not yet seeded" in the UI. */
export async function listSeededSpecs(season: string): Promise<{ class: string; spec: string }[]> {
  const lists = await loadAllSeeds(season);
  return lists.map((l) => ({ class: l.class, spec: l.spec }));
}
