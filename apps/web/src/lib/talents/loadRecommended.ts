/**
 * Reads the versioned recommended-talent-build seed JSON from /data/talents.
 * JSON-file-only (no DB fallback) — unlike BiS data, this is small and
 * doesn't need Postgres/seed-script parity; see getRecommendedBuild.ts.
 * Bundled via import.meta.glob for the same reason as bis/loadSeeds.ts.
 */
import { specSlug } from '@/lib/ingest/specCatalogue';
import { RecommendedTalentBuildSchema, type RecommendedContentType, type RecommendedTalentBuild } from '@mythos/core/talents';

const SEED_FILES = import.meta.glob<unknown>('../../../data/talents/*/*.json', { import: 'default' });

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
  const key = `../../../data/talents/${season}/${fileName(className, specName, contentType)}`;
  const load = SEED_FILES[key];
  if (!load) return null;
  try {
    return RecommendedTalentBuildSchema.parse(await load());
  } catch (err) {
    throw new Error(`Invalid talent seed file ${key}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
