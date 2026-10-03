/**
 * Reads the versioned meta tier-list seed JSON from /data/meta.
 * JSON-file-only, same "no DB needed" contract as talents/loadRecommended.ts.
 * Bundled via import.meta.glob for the same reason as bis/loadSeeds.ts.
 */
import { MetaTierListSchema, type MetaTierList } from './types';

const SEED_FILES = import.meta.glob<unknown>('../../../data/meta/*/*.json', { import: 'default' });

export async function loadTierListFile(season: string, contentType: string): Promise<MetaTierList | null> {
  const key = `../../../data/meta/${season}/${contentType}-tier-list.json`;
  const load = SEED_FILES[key];
  if (!load) return null;
  try {
    return MetaTierListSchema.parse(await load());
  } catch (err) {
    throw new Error(`Invalid meta tier-list seed file ${key}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
