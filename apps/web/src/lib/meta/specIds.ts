/**
 * Blizzard's playable-specialization ids, keyed by "{class}::{spec}" using
 * the exact class/spec name strings the meta tier-list JSON uses. There's
 * no bulk index that pairs spec id with class name, so each was verified
 * live against /data/wow/playable-specialization/{id} for all 40 specs
 * (2026-09-02), including the new Midnight "Devourer" Demon Hunter spec.
 *
 * No node-only imports here (unlike bis/loadSeeds.ts's specSlug) — this
 * file is safe to import from a client component.
 */
export function specKey(className: string, specName: string): string {
  return `${className}::${specName}`;
}

/** URL-safe slug for a class or spec name, e.g. "Death Knight" -> "death-knight". */
export function urlSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export const SPEC_IDS: Record<string, number> = {
  [specKey('Death Knight', 'Blood')]: 250,
  [specKey('Death Knight', 'Frost')]: 251,
  [specKey('Death Knight', 'Unholy')]: 252,
  [specKey('Demon Hunter', 'Havoc')]: 577,
  [specKey('Demon Hunter', 'Vengeance')]: 581,
  [specKey('Demon Hunter', 'Devourer')]: 1480,
  [specKey('Druid', 'Balance')]: 102,
  [specKey('Druid', 'Feral')]: 103,
  [specKey('Druid', 'Guardian')]: 104,
  [specKey('Druid', 'Restoration')]: 105,
  [specKey('Evoker', 'Devastation')]: 1467,
  [specKey('Evoker', 'Preservation')]: 1468,
  [specKey('Evoker', 'Augmentation')]: 1473,
  [specKey('Hunter', 'Beast Mastery')]: 253,
  [specKey('Hunter', 'Marksmanship')]: 254,
  [specKey('Hunter', 'Survival')]: 255,
  [specKey('Mage', 'Arcane')]: 62,
  [specKey('Mage', 'Fire')]: 63,
  [specKey('Mage', 'Frost')]: 64,
  [specKey('Monk', 'Brewmaster')]: 268,
  [specKey('Monk', 'Mistweaver')]: 270,
  [specKey('Monk', 'Windwalker')]: 269,
  [specKey('Paladin', 'Holy')]: 65,
  [specKey('Paladin', 'Protection')]: 66,
  [specKey('Paladin', 'Retribution')]: 70,
  [specKey('Priest', 'Discipline')]: 256,
  [specKey('Priest', 'Holy')]: 257,
  [specKey('Priest', 'Shadow')]: 258,
  [specKey('Rogue', 'Assassination')]: 259,
  [specKey('Rogue', 'Outlaw')]: 260,
  [specKey('Rogue', 'Subtlety')]: 261,
  [specKey('Shaman', 'Elemental')]: 262,
  [specKey('Shaman', 'Enhancement')]: 263,
  [specKey('Shaman', 'Restoration')]: 264,
  [specKey('Warlock', 'Affliction')]: 265,
  [specKey('Warlock', 'Demonology')]: 266,
  [specKey('Warlock', 'Destruction')]: 267,
  [specKey('Warrior', 'Arms')]: 71,
  [specKey('Warrior', 'Fury')]: 72,
  [specKey('Warrior', 'Protection')]: 73,
};
