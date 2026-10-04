import type { Source } from '../bis/types';

const DIFFICULTY_LABEL: Record<string, string> = {
  lfr: 'LFR',
  normal: 'Normal',
  heroic: 'Heroic',
  mythic: 'Mythic',
};

export function sourceLabel(source: Source): string {
  switch (source.type) {
    case 'raid':
      // Tier pieces have no single boss (they come from the set, not an
      // encounter's loot table), so the boss is omitted rather than invented.
      return `${source.difficulty ? DIFFICULTY_LABEL[source.difficulty] : 'Raid'} — ${source.boss ? `${source.boss}, ` : ''}${source.instance ?? 'Raid'}`;
    case 'dungeon':
      return `M+ ${source.dungeon ?? 'Dungeon'}${source.keyLevel ? ` (${source.keyLevel}+)` : ''}`;
    case 'crafted':
      return `Crafted${source.craftQuality ? ` (Q${source.craftQuality})` : ''}`;
    case 'catalyst':
      return 'Catalyst — Upgrade any Tier piece';
    case 'vault':
      return 'Great Vault';
    case 'world':
      return 'World Drop';
    case 'pvp':
      return 'PvP';
    case 'other':
      return 'Source not in the Adventure Guide';
    case 'profession':
      return 'Profession';
    default:
      return 'Unknown source';
  }
}
