/**
 * Batched per-item and per-spell lookups: icon urls, and BiS tooltip detail.
 * Each lookup is individually cached (see client.ts), and a missing result
 * is simply absent from the map so callers fall back to the placeholder
 * rather than failing.
 *
 * Lookups run a few at a time rather than all at once. A talent tree is
 * ~120 spells, and firing them together on a cold cache tripped Blizzard's
 * ~100 requests/second limit: about one icon in six came back 429, rendered
 * as a "?", and (failures aren't cached) stayed that way until a reload.
 */
import { getItemIconUrl, getItemTooltipSource, getSpellIconUrl } from './client';
import type { ItemTooltipSource } from './schemas';

const CONCURRENCY = 8;

async function lookupAll<T>(ids: Iterable<number>, lookup: (id: number) => Promise<T | null>): Promise<Map<number, T>> {
  const queue = [...new Set(ids)];
  const found = new Map<number, T>();
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const result = await lookup(id);
      if (result) found.set(id, result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return found;
}

export function getItemIconUrls(region: string, itemIds: Iterable<number>): Promise<Map<number, string>> {
  return lookupAll(itemIds, (id) => getItemIconUrl(region, id));
}

export function getSpellIconUrls(region: string, spellIds: Iterable<number>): Promise<Map<number, string>> {
  return lookupAll(spellIds, (id) => getSpellIconUrl(region, id));
}

export function getItemTooltipSources(region: string, itemIds: Iterable<number>): Promise<Map<number, ItemTooltipSource>> {
  return lookupAll(itemIds, (id) => getItemTooltipSource(region, id));
}
