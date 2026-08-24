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

const DEFAULT_ACCENT = '#c41e3a';

export function classColor(wowClass: string | null | undefined): string {
  if (!wowClass) return DEFAULT_ACCENT;
  const key = wowClass.toLowerCase().replace(/\s+/g, '-') as WowClass;
  return CLASS_COLORS[key] ?? DEFAULT_ACCENT;
}
