/**
 * Batched icon-url lookup for a set of items. Each lookup is individually
 * cached (see getItemIconUrl), and a missing icon is simply absent from the
 * result so callers fall back to the placeholder rather than failing.
 */
import { getItemIconUrl } from './client';

export async function getItemIconUrls(region: string, itemIds: Iterable<number>): Promise<Map<number, string>> {
  const unique = [...new Set(itemIds)];
  const entries = await Promise.all(unique.map(async (id) => [id, await getItemIconUrl(region, id)] as const));
  return new Map(entries.filter((e): e is [number, string] => e[1] !== null));
}
