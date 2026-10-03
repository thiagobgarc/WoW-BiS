/**
 * Reads and validates the versioned BiS seed JSON files from /data/bis.
 * Used as the zero-infra fallback (see getBisList.ts) so the upgrade board
 * works before DATABASE_URL is configured.
 *
 * The files are bundled through Vite's import.meta.glob rather than read
 * from disk: a deployed Vercel function doesn't carry /data and its cwd
 * isn't apps/web, so a runtime readFile finds nothing there. Each file is
 * its own lazily-loaded chunk. Scripts run outside Vite (scripts/seed.ts)
 * read the files from disk themselves.
 */
import { BisListSchema, type BisList } from '@mythos/core/bis';

export { specSlug } from '@/lib/ingest/specCatalogue';
import { specSlug } from '@/lib/ingest/specCatalogue';

const SEED_FILES = import.meta.glob<unknown>('../../../data/bis/*/*.json', { import: 'default' });

function seedKey(season: string, slug: string): string {
  return `../../../data/bis/${season}/${slug}.json`;
}

function parse(key: string, raw: unknown): BisList {
  try {
    return BisListSchema.parse(raw);
  } catch (err) {
    throw new Error(`Invalid BiS seed file ${key}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function loadSeedFile(season: string, className: string, specName: string): Promise<BisList | null> {
  const key = seedKey(season, specSlug(className, specName));
  const load = SEED_FILES[key];
  return load ? parse(key, await load()) : null;
}

export async function loadAllSeeds(season: string): Promise<BisList[]> {
  const prefix = `../../../data/bis/${season}/`;
  const keys = Object.keys(SEED_FILES).filter((k) => k.startsWith(prefix)).sort();
  return Promise.all(keys.map(async (k) => parse(k, await SEED_FILES[k]!())));
}

/** Which specs currently have seed data, for surfacing "not yet seeded" in the UI. */
export async function listSeededSpecs(season: string): Promise<{ class: string; spec: string }[]> {
  const lists = await loadAllSeeds(season);
  return lists.map((l) => ({ class: l.class, spec: l.spec }));
}
