// MOCK: Used only when BLIZZARD_CLIENT_ID/SECRET are unset, so the app is
// runnable with zero infra/credentials. Shaped to pass the same Zod schemas
// real Blizzard responses go through, and mirrors the mockup's sample
// character (Arthas, Unholy Death Knight, Illidan-US) so Phase 1/2 UI can be
// verified end-to-end before real API creds are wired up. Swap this out by
// setting real credentials — client.ts only reaches for mock data when
// `hasBlizzardCredentials()` is false.
import type {
  CharacterEquipment,
  CharacterMedia,
  CharacterProfile,
  CharacterStatistics,
} from './schemas';

export const MOCK_CHARACTER_KEY = { region: 'us', realmSlug: 'illidan', name: 'arthas' };

export const MOCK_PROFILE: CharacterProfile = {
  id: 1,
  name: 'Arthas',
  level: 80,
  faction: { type: 'ALLIANCE', name: 'Alliance' },
  race: { id: 5, name: 'Undead', key: { href: '' } },
  character_class: { id: 6, name: 'Death Knight', key: { href: '' } },
  // Frost, not Unholy: matches the seeded death-knight-frost.json BiS list
  // so the default mock demo exercises the full upgrade board out of the box.
  active_spec: { id: 251, name: 'Frost', key: { href: '' } },
  realm: { id: 11, name: 'Illidan', slug: 'illidan' },
  guild: { name: 'Death and Taxes' },
  average_item_level: 487,
  equipped_item_level: 489,
  last_login_timestamp: Date.now() - 1000 * 60 * 60 * 3,
};

function slotItem(
  slotType: string,
  overrides: Partial<CharacterEquipment['equipped_items'][number]>,
): CharacterEquipment['equipped_items'][number] {
  return {
    item: { id: 1 },
    slot: { type: slotType, name: slotType },
    quality: { type: 'RARE', name: 'Rare' },
    name: 'Mock Item',
    level: { value: 489 },
    ...overrides,
  };
}

export const MOCK_EQUIPMENT: CharacterEquipment = {
  equipped_items: [
    slotItem('HEAD', {
      item: { id: 212001 },
      name: 'Crown of the Eternal Winter',
      quality: { type: 'EPIC', name: 'Epic' },
      level: { value: 489 },
      set: { item_set: { id: 1, name: 'Deathbringer' }, display_string: '2/5 pieces' },
      sockets: [{ socket_type: { type: 'PRISMATIC', name: 'Prismatic' }, item: { id: 999, name: 'Sapphire' }, display_string: 'Sapphire' }],
    }),
    slotItem('NECK', {
      item: { id: 212002 },
      name: 'Pendant of the Void Star',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 489 },
    }),
    slotItem('SHOULDER', {
      item: { id: 212003 },
      name: 'Mantle of the Endless Void',
      quality: { type: 'EPIC', name: 'Epic' },
      level: { value: 489 },
      set: { item_set: { id: 1, name: 'Deathbringer' }, display_string: '2/5 pieces' },
      is_embellishment: true,
    }),
    slotItem('BACK', {
      item: { id: 212004 },
      name: 'Cloak of Shadows',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 489 },
    }),
    slotItem('CHEST', {
      item: { id: 212005 },
      name: 'Gravecloak of the Forsaken',
      quality: { type: 'EPIC', name: 'Epic' },
      level: { value: 489 },
      set: { item_set: { id: 1, name: 'Deathbringer' }, display_string: '2/5 pieces' },
    }),
    // WAIST intentionally absent — the mockup's "Empty" slot.
    slotItem('WRIST', {
      item: { id: 212007 },
      name: 'Cuff of the Unbound',
      quality: { type: 'UNCOMMON', name: 'Uncommon' },
      level: { value: 476 },
      sockets: [{ socket_type: { type: 'PRISMATIC', name: 'Prismatic' } }],
    }),
    slotItem('HANDS', {
      item: { id: 212008 },
      name: 'Gauntlets of Profaned Secrets',
      quality: { type: 'EPIC', name: 'Epic' },
      level: { value: 489 },
      set: { item_set: { id: 1, name: 'Deathbringer' }, display_string: '2/5 pieces' },
    }),
    slotItem('LEGS', {
      item: { id: 212009 },
      name: 'Leggings of Unending Sorrow',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 489 },
    }),
    slotItem('FEET', {
      item: { id: 212010 },
      name: 'Sabatons of the Shadowy Mire',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 489 },
    }),
    slotItem('FINGER_1', {
      item: { id: 212011 },
      name: 'Seal of the Poisoned Pact',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 489 },
    }),
    slotItem('FINGER_2', {
      item: { id: 212012 },
      name: 'Ring of Unholy Power',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 489 },
    }),
    slotItem('TRINKET_1', {
      item: { id: 212013 },
      name: "Spymaster's Web",
      quality: { type: 'EPIC', name: 'Epic' },
      level: { value: 489 },
    }),
    slotItem('TRINKET_2', {
      item: { id: 212014 },
      name: 'Treacherous Transmitter',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 486 },
    }),
    slotItem('MAIN_HAND', {
      item: { id: 212015 },
      name: 'Axe of the Deathforged',
      quality: { type: 'EPIC', name: 'Epic' },
      level: { value: 489 },
      enchantments: [{ enchantment_id: 1, display_string: 'Enchanted: Haste' }],
    }),
    slotItem('OFF_HAND', {
      item: { id: 212016 },
      name: 'Phantom Sword',
      quality: { type: 'RARE', name: 'Rare' },
      level: { value: 486 },
    }),
  ],
};

export const MOCK_MEDIA: CharacterMedia = {
  assets: [
    { key: 'avatar', value: '' },
    { key: 'main', value: '' },
  ],
};

export const MOCK_STATISTICS: CharacterStatistics = {
  health: 1_200_000,
  melee_haste: { rating: 1247, value: 18.2 },
  melee_crit: { rating: 892, value: 12.1 },
  mastery: { rating: 634, value: 8.4 },
  versatility: 756,
};

export function hasBlizzardCredentials(): boolean {
  return Boolean(process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET);
}
