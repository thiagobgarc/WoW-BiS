/**
 * Fetches every spec's icon (for the Meta tier list) in one batch. Each
 * icon is independently cached long-term by getSpecIconUrl, so this is
 * cheap after the first request; returns null per spec with no
 * credentials configured or on any fetch failure, same "never block
 * rendering on a missing icon" contract as item/spell media.
 */
import { getSpecIconUrl } from '@/lib/blizzard/client';
import { SPEC_IDS } from './specIds';

export async function getAllSpecIcons(region: string): Promise<Record<string, string | null>> {
  const keys = Object.keys(SPEC_IDS);
  const urls = await Promise.all(keys.map((k) => getSpecIconUrl(region, SPEC_IDS[k]!)));
  return Object.fromEntries(keys.map((k, i) => [k, urls[i]]));
}
