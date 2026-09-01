/**
 * Reads the versioned recommended-talent-build seed JSON from /data/talents.
 * JSON-file-only (no DB fallback) — unlike BiS data, this is small and
 * doesn't need Postgres/seed-script parity; see getRecommendedBuild.ts.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { specSlug } from '@/lib/bis/loadSeeds';
import { RecommendedTalentBuildSchema, type RecommendedTalentBuild } from './types';

const DATA_ROOT = path.join(process.cwd(), 'data', 'talents');

export async function loadRecommendedBuildFile(season: string, className: string, specName: string): Promise<RecommendedTalentBuild | null> {
  const filePath = path.join(DATA_ROOT, season, `${specSlug(className, specName)}.json`);
  try {
    const raw = await readFile(filePath, 'utf-8');
    return RecommendedTalentBuildSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Invalid talent seed file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
