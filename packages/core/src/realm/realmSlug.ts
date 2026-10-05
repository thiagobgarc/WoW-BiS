/**
 * Normalizes a human-readable realm name into the slug Blizzard's API
 * expects in URL paths. This is a real bug source (apostrophes, accented
 * EU names, existing hyphens, parenthetical locale suffixes), so every rule
 * here is covered by a dedicated unit test against real realm names —
 * see realmSlug.test.ts.
 *
 * Rules, in order:
 *  1. Unicode-normalize to decomposed form so accents become separate
 *     combining marks (é -> e + U+0301), then...
 *  2. Drop apostrophes entirely (Kel'Thuzad -> kelthuzad, not kel-thuzad).
 *  3. Lowercase and trim.
 *  4. Collapse whitespace to single hyphens.
 *  5. Drop anything that isn't a-z, 0-9, or hyphen — this is what actually
 *     removes the decomposed accent marks from step 1, along with parens
 *     and other punctuation (Aggra (Português) -> aggra-portugues).
 *  6. Collapse repeated hyphens and trim leading/trailing hyphens.
 */
export function realmSlug(realmName: string): string {
  return realmName
    .normalize('NFD')
    .replace(/'/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Blizzard character names are case-insensitive; always lowercase before requesting. */
export function characterSlug(characterName: string): string {
  return characterName.trim().toLowerCase();
}

/**
 * Lowercased with accents stripped, so "Zòë" and "zoe" compare equal. For
 * matching what someone typed against a name, never for building a URL:
 * Blizzard only resolves a name spelled exactly, accents included.
 */
export function foldName(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Where `query` sits inside `name` when accents are ignored, as a
 * [start, end) range over the name's own characters, for highlighting the
 * match. "zoe" has to light up all three letters of "Zòë" even though the
 * two strings differ in length once decomposed. Null when it doesn't match.
 */
export function foldedMatchRange(name: string, query: string): [number, number] | null {
  const q = foldName(query.trim());
  if (!q) return null;
  let folded = '';
  const origin: number[] = [];
  for (let i = 0; i < name.length; ) {
    const ch = String.fromCodePoint(name.codePointAt(i)!);
    const f = foldName(ch);
    for (let k = 0; k < f.length; k++) origin.push(i);
    folded += f;
    i += ch.length;
  }
  const at = folded.indexOf(q);
  if (at < 0) return null;
  const end = at + q.length;
  return [origin[at]!, end < origin.length ? origin[end]! : name.length];
}
