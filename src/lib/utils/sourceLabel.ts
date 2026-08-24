import type { Source } from '@/lib/bis/types';

const DIFFICULTY_LABEL: Record<string, string> = {
  lfr: 'LFR',
  normal: 'Normal',
  heroic: 'Heroic',
  mythic: 'Mythic',
};

export function sourceLabel(source: Source): string {
  switch (source.type) {
    case 'raid':
      return `${source.difficulty ? DIFFICULTY_LABEL[source.difficulty] : 'Raid'} — ${source.boss ?? 'Unknown Boss'}, ${source.instance ?? 'Raid'}`;
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
    case 'profession':
      return 'Profession';
    default:
      return 'Unknown source';
  }
}
