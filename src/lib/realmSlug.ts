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
