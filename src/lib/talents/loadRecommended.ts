/**
 * Reads the versioned recommended-talent-build seed JSON from /data/talents.
 * JSON-file-only (no DB fallback) — unlike BiS data, this is small and
 * doesn't need Postgres/seed-script parity; see getRecommendedBuild.ts.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { specSlug } from '@/lib/bis/loadSeeds';
import { RecommendedTalentBuildSchema, type RecommendedContentType, type RecommendedTalentBuild } from './types';

const DATA_ROOT = path.join(process.cwd(), 'data', 'talents');

// Mythic+ keeps the original bare filename (no suffix) so the existing
// seed files under data/talents/<season>/ don't need renaming.
function fileName(className: string, specName: string, contentType: RecommendedContentType): string {
  const base = specSlug(className, specName);
  return contentType === 'raid' ? `${base}-raid.json` : `${base}.json`;
}

export async function loadRecommendedBuildFile(
  season: string,
  className: string,
  specName: string,
  contentType: RecommendedContentType = 'mythic-plus',
): Promise<RecommendedTalentBuild | null> {
  const filePath = path.join(DATA_ROOT, season, fileName(className, specName, contentType));
  try {
    const raw = await readFile(filePath, 'utf-8');
    return RecommendedTalentBuildSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Invalid talent seed file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
