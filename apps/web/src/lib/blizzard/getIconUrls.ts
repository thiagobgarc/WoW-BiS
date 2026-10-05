/**
 * Batched icon-url lookups for items and spells. Each lookup is
 * individually cached (see getItemIconUrl / getSpellIconUrl), and a missing
 * icon is simply absent from the result so callers fall back to the
 * placeholder rather than failing.
 *
 * Lookups run a few at a time rather than all at once. A talent tree is
 * ~120 spells, and firing them together on a cold cache tripped Blizzard's
 * ~100 requests/second limit: about one icon in six came back 429, rendered
 * as a "?", and (failures aren't cached) stayed that way until a reload.
 */
import { getItemIconUrl, getSpellIconUrl } from './client';

const CONCURRENCY = 8;

async function lookupAll(ids: Iterable<number>, lookup: (id: number) => Promise<string | null>): Promise<Map<number, string>> {
  const queue = [...new Set(ids)];
  const found = new Map<number, string>();
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const url = await lookup(id);
      if (url) found.set(id, url);
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
