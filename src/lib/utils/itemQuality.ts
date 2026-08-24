/**
 * Canonical WoW item quality colors — non-negotiable, matches in-game exactly.
 * Blizzard's API returns quality as an enum name (e.g. "EPIC"); normalize to
 * lowercase before lookup.
 */
export const QUALITY_COLORS = {
  poor: '#9d9d9d',
  common: '#ffffff',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
  artifact: '#e6cc80',
  heirloom: '#00ccff',
} as const;

export type ItemQuality = keyof typeof QUALITY_COLORS;

export function qualityColor(quality: string | null | undefined): string {
  if (!quality) return QUALITY_COLORS.common;
  const key = quality.toLowerCase() as ItemQuality;
  return QUALITY_COLORS[key] ?? QUALITY_COLORS.common;
}
