/**
 * Reads the versioned meta tier-list seed JSON from /data/meta.
 * JSON-file-only, same "no DB needed" contract as talents/loadRecommended.ts.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MetaTierListSchema, type MetaTierList } from './types';

const DATA_ROOT = path.join(process.cwd(), 'data', 'meta');

export async function loadTierListFile(season: string, contentType: string): Promise<MetaTierList | null> {
  const filePath = path.join(DATA_ROOT, season, `${contentType}-tier-list.json`);
  try {
    const raw = await readFile(filePath, 'utf-8');
    return MetaTierListSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Invalid meta tier-list seed file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
