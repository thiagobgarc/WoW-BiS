/**
 * Canonical WoW class colors. Used as the single source for the page's
 * `--accent` custom property, set at the layout level from the looked-up
 * character's class so the whole page re-themes per character.
 */
export const CLASS_COLORS = {
  'death-knight': '#C41E3A',
  'demon-hunter': '#A330C9',
  druid: '#FF7C0A',
  evoker: '#33937F',
  hunter: '#AAD372',
  mage: '#3FC7EB',
  monk: '#00FF98',
  paladin: '#F48CBA',
  priest: '#FFFFFF',
  rogue: '#FFF468',
  shaman: '#0070DD',
  warlock: '#8788EE',
  warrior: '#C69B6D',
} as const;

export type WowClass = keyof typeof CLASS_COLORS;

// Blizzard's playable-class ids — stable game-data constants, verified
// live against /data/wow/playable-class/index (2026-09-02).
export const CLASS_IDS: Record<WowClass, number> = {
  warrior: 1,
  paladin: 2,
  hunter: 3,
  rogue: 4,
  priest: 5,
  'death-knight': 6,
  shaman: 7,
  mage: 8,
  warlock: 9,
  monk: 10,
  druid: 11,
  'demon-hunter': 12,
  evoker: 13,
};

const DEFAULT_ACCENT = '#c41e3a';

export function classSlug(wowClass: string): WowClass {
  return wowClass.toLowerCase().replace(/\s+/g, '-') as WowClass;
}

export function classColor(wowClass: string | null | undefined): string {
  if (!wowClass) return DEFAULT_ACCENT;
  return CLASS_COLORS[classSlug(wowClass)] ?? DEFAULT_ACCENT;
}
