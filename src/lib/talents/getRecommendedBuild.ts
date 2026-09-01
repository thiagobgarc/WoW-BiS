/**
 * Single entry point the talent tree section uses to fetch a spec's
 * recommended Mythic+ build. Zero-infra by construction (JSON-only), same
 * "not yet seeded" contract as getBisList.ts.
 */
import { loadRecommendedBuildFile } from './loadRecommended';
import type { RecommendedTalentBuild } from './types';

export interface RecommendedBuildResult {
  build: RecommendedTalentBuild | null;
  seeded: boolean;
}

export async function getRecommendedBuild(season: string, className: string, specName: string): Promise<RecommendedBuildResult> {
  const build = await loadRecommendedBuildFile(season, className, specName);
  return { build, seeded: build !== null };
}
