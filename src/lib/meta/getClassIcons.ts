/**
 * Fetches every WoW class's icon (for the Meta tier list) in one batch.
 * Each icon is independently cached long-term by getClassIconUrl, so this
 * is cheap after the first request; returns null per class with no
 * credentials configured or on any fetch failure, same "never block
 * rendering on a missing icon" contract as item/spell media.
 */
import { getClassIconUrl } from '@/lib/blizzard/client';
import { CLASS_IDS, type WowClass } from '@/lib/utils/classColors';

export async function getAllClassIcons(region: string): Promise<Record<WowClass, string | null>> {
  const slugs = Object.keys(CLASS_IDS) as WowClass[];
  const urls = await Promise.all(slugs.map((slug) => getClassIconUrl(region, CLASS_IDS[slug])));
  return Object.fromEntries(slugs.map((slug, i) => [slug, urls[i]])) as Record<WowClass, string | null>;
}
