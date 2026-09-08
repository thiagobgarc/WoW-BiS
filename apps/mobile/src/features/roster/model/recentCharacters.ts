/**
 * The `roster` context's only aggregate: the characters this device has
 * looked at.
 *
 * architecture.md Section 3 calls `roster` "the only context with a real
 * write model", and Section 4 keeps it entirely device-local — there are no
 * user accounts, so this list exists on exactly one phone and is never sent
 * anywhere. Everything here is pure so the rules can be tested without a
 * store, a renderer or MMKV; `../store.ts` is the thin stateful shell.
 *
 * The shape is the web's `RecentCharacter` (useRecentCharacters.ts), which
 * mobile-ux.md's mapping table says to keep, with two deliberate changes:
 *
 *  - `region` is the contract's `RegionSchema` rather than a bare string.
 *    A region reaches Blizzard's API hostname eventually, and the enum is
 *    already the thing both the server and the client agree on; validating
 *    on the way off disk means a corrupted or hand-edited entry is dropped
 *    here rather than becoming a request the server has to reject.
 *  - `className` is new and optional. The web has no use for it, but this
 *    app re-themes per character via `accentVars(className)`, so carrying
 *    the class makes a recent row wear its own class color for free. It is
 *    nullable because entries written by an older build won't have it.
 */
import { z } from 'zod';
import { RegionSchema } from '@mythos/api-contract';

/** Same cap as the web's list. Eight fits a phone screen without scrolling. */
export const MAX_RECENT = 8;

export const RecentCharacterSchema = z.object({
  name: z.string().min(1).max(64),
  realmName: z.string().min(1).max(64),
  realmSlug: z.string().min(1).max(64),
  region: RegionSchema,
  /** Null for entries written before this field existed. */
  className: z.string().max(32).nullable().default(null),
});
export type RecentCharacter = z.infer<typeof RecentCharacterSchema>;

/**
 * What actually identifies a character, for dedup and for React keys.
 *
 * `region` is a plain string rather than `Region`: this is a key builder, and
 * it is also called with a `DomainCharacter` straight off the wire, where the
 * field is typed as whatever Blizzard sent. Narrowing to the enum is the
 * store's job, not the key's.
 */
export type CharacterIdentity = Pick<RecentCharacter, 'name' | 'realmSlug'> & { region: string };

/**
 * WoW character names are unique per realm *case-insensitively*, so `Arthas`
 * and `arthas` are one character and must collapse to one entry. The web's
 * hook compares names with `===` and would keep both; that is a latent bug
 * there rather than a rule worth porting, so this lowercases. Recorded as a
 * deviation in architecture.md Section 10.
 */
export function recentKey(character: CharacterIdentity): string {
  return `${character.region}/${character.realmSlug}/${character.name.toLowerCase()}`;
}

/** Every field, so the no-op guard below can't call two different entries equal. */
function sameEntry(a: RecentCharacter, b: RecentCharacter): boolean {
  return (
    a.name === b.name &&
    a.realmName === b.realmName &&
    a.realmSlug === b.realmSlug &&
    a.region === b.region &&
    a.className === b.className
  );
}

/**
 * Most-recent-first, deduped, capped. Returns the original array unchanged
 * when the head is already exactly this entry, so a re-visit of the
 * character you are already looking at doesn't churn the store or rewrite
 * MMKV — and only then. Comparing identity alone was not enough: two entries
 * can share a key and still differ, most obviously when the first was stored
 * from a hand-typed name and the second carries Blizzard's own spelling.
 * That update has to land, or the roster keeps the typo forever.
 */
export function addRecent(list: RecentCharacter[], entry: RecentCharacter): RecentCharacter[] {
  const [head] = list;
  if (head && sameEntry(head, entry)) return list;

  const key = recentKey(entry);
  return [entry, ...list.filter((c) => recentKey(c) !== key)].slice(0, MAX_RECENT);
}

/**
 * Whatever came off disk, reduced to entries this build can actually render.
 *
 * A persisted list is restored *before* any schema check would otherwise run
 * and outlives app updates by years, so it is treated exactly like a network
 * response: parsed, not trusted. Bad entries are dropped individually rather
 * than failing the whole list — losing one malformed row is recoverable,
 * losing the roster is the one thing in this app a person would miss.
 */
export function parseRecentList(raw: unknown): RecentCharacter[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const parsed: RecentCharacter[] = [];

  for (const candidate of raw) {
    const result = RecentCharacterSchema.safeParse(candidate);
    if (!result.success) continue;

    const key = recentKey(result.data);
    if (seen.has(key)) continue;

    seen.add(key);
    parsed.push(result.data);
    if (parsed.length === MAX_RECENT) break;
  }

  return parsed;
}

/**
 * The web splits this across a `NameCombobox` popover and a "recently
 * viewed" chip row. On a phone there is room for one always-visible list, so
 * the list itself narrows as you type — same behaviour, one fewer surface.
 * An empty query matches everything, which is the cold-launch state.
 */
export function matchRecent(list: RecentCharacter[], query: string): RecentCharacter[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((c) => c.name.toLowerCase().includes(needle));
}
