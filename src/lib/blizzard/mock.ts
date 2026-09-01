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
  CharacterRaids,
  CharacterSpecializations,
  CharacterStatistics,
  MythicKeystoneProfileIndex,
  MythicKeystoneSeason,
  TalentTree,
} from './schemas';
// Real GET .../talent-tree/{id}/playable-specialization/251 response for
// Frost Death Knight (matches MOCK_PROFILE's spec), trimmed of fields we
// don't read. Legitimate static game data, not fabricated — using it here
// keeps mock mode visually identical to the real feature.
import mockTalentTreeRaw from './mockTalentTree.json';

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
  melee_haste: { rating_normalized: 1247, value: 18.2 },
  melee_crit: { rating_normalized: 892, value: 12.1 },
  mastery: { rating_normalized: 634, value: 8.4 },
  versatility: 756,
  versatility_damage_done_bonus: 11.0,
};

export const MOCK_TALENT_TREE = mockTalentTreeRaw as unknown as TalentTree;

// A plausible Mythic+-oriented Frost DK build (node ids + ranks resolved
// against the real tree above by talent name) so mock mode demonstrates a
// fully populated current-build tree, not an empty one.
const MOCK_CLASS_TALENTS: { id: number; rank: number }[] = [
  { id: 76081, rank: 1 }, { id: 76071, rank: 1 }, { id: 76067, rank: 1 }, { id: 76084, rank: 1 },
  { id: 76066, rank: 1 }, { id: 76068, rank: 1 }, { id: 76065, rank: 1 }, { id: 76085, rank: 1 },
  { id: 76060, rank: 1 }, { id: 76064, rank: 1 }, { id: 76057, rank: 1 }, { id: 76076, rank: 1 },
  { id: 76054, rank: 2 }, { id: 76079, rank: 2 }, { id: 76080, rank: 1 }, { id: 76088, rank: 1 },
  { id: 102007, rank: 1 },
];
const MOCK_SPEC_TALENTS: { id: number; rank: number }[] = [
  { id: 76105, rank: 1 }, { id: 76100, rank: 1 }, { id: 76099, rank: 1 }, { id: 76122, rank: 2 },
  { id: 101930, rank: 1 }, { id: 101933, rank: 1 }, { id: 76106, rank: 1 }, { id: 76091, rank: 1 },
  { id: 101929, rank: 1 }, { id: 76098, rank: 1 }, { id: 76110, rank: 1 }, { id: 76117, rank: 1 },
  { id: 76102, rank: 2 }, { id: 76118, rank: 1 }, { id: 76092, rank: 1 }, { id: 76121, rank: 1 },
  { id: 101931, rank: 1 }, { id: 76101, rank: 1 }, { id: 76033, rank: 2 }, { id: 76095, rank: 1 },
  { id: 76094, rank: 1 },
];

// San'layn hero nodes, same trimmed-real-data provenance as the trees above.
const MOCK_HERO_TALENTS: { id: number; rank: number }[] = [
  { id: 95033, rank: 1 }, { id: 95040, rank: 1 }, { id: 95045, rank: 1 }, { id: 95046, rank: 1 },
  { id: 95048, rank: 1 }, { id: 95051, rank: 1 }, { id: 95053, rank: 1 }, { id: 95055, rank: 1 },
  { id: 95056, rank: 1 }, { id: 95064, rank: 1 }, { id: 95065, rank: 1 }, { id: 109736, rank: 1 },
  { id: 109737, rank: 1 }, { id: 109738, rank: 1 },
];

export const MOCK_SPECIALIZATIONS: CharacterSpecializations = {
  specializations: [
    {
      specialization: { id: 251, name: 'Frost' },
      loadouts: [
        {
          is_active: true,
          selected_class_talents: MOCK_CLASS_TALENTS,
          selected_spec_talents: MOCK_SPEC_TALENTS,
          selected_hero_talents: MOCK_HERO_TALENTS,
          selected_hero_talent_tree: { id: 31, name: "San'layn" },
        },
      ],
    },
  ],
};

// Themed to match this season's real config (src/lib/season/seasonConfig.ts):
// "The Venomous Abyss" raid (8 bosses) and the real 8-dungeon Season 2 M+
// pool, so mock mode's new Raid Progression / Mythic+ tabs demo realistically
// without Blizzard credentials. Shape verified live against a real character
// (see schemas.ts's raid/mythic-keystone doc comments) — this is invented
// per-character progress laid over that real shape, not fabricated schema.
function raidEncounter(id: number, name: string, killedTimesAgoMs: number, count = 1) {
  return {
    encounter: { id, name },
    completed_count: count,
    last_kill_timestamp: Date.now() - killedTimesAgoMs,
  };
}

const VENOMOUS_ABYSS_BOSSES = [
  { id: 401001, name: "Nek'zali the Soulcoiler" },
  { id: 401002, name: 'Entombed Sentinels' },
  { id: 401003, name: 'The Lost Explorers' },
  { id: 401004, name: 'Vashnik the Malignant' },
  { id: 401005, name: 'Sszorak' },
  { id: 401006, name: 'The Twin Fangs' },
  { id: 401007, name: 'The Coiled Altar' },
  { id: 401008, name: "Ula'tek" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function raidMode(difficultyType: string, difficultyName: string, killedCount: number) {
  return {
    difficulty: { type: difficultyType, name: difficultyName },
    status: { type: killedCount >= VENOMOUS_ABYSS_BOSSES.length ? 'COMPLETE' : 'IN_PROGRESS', name: killedCount >= VENOMOUS_ABYSS_BOSSES.length ? 'Complete' : 'In Progress' },
    progress: {
      completed_count: killedCount,
      total_count: VENOMOUS_ABYSS_BOSSES.length,
      encounters: VENOMOUS_ABYSS_BOSSES.slice(0, killedCount).map((b, i) => raidEncounter(b.id, b.name, (killedCount - i) * DAY_MS)),
    },
  };
}

export const MOCK_RAIDS: CharacterRaids = {
  expansions: [
    {
      expansion: { id: 501, name: 'Midnight' },
      instances: [
        {
          instance: { id: 40100, name: 'The Venomous Abyss' },
          modes: [
            raidMode('LFR', 'Raid Finder', 8),
            raidMode('NORMAL', 'Normal', 8),
            raidMode('HEROIC', 'Heroic', 8),
            raidMode('MYTHIC', 'Mythic', 5),
          ],
        },
      ],
    },
  ],
};

export const MOCK_MYTHIC_KEYSTONE_PROFILE_INDEX: MythicKeystoneProfileIndex = {
  current_period: { period: { id: 1078 } },
  current_mythic_rating: { rating: 2487.3, color: { r: 255, g: 128, b: 0, a: 1 } },
  seasons: [{ id: 18 }],
};

const S2_DUNGEONS = [
  { id: 402001, name: 'Altar of Fangs' },
  { id: 402002, name: 'Murder Row' },
  { id: 402003, name: 'Den of Nalorakk' },
  { id: 402004, name: 'The Blinding Vale' },
  { id: 402005, name: 'Voidscar Arena' },
  { id: 402006, name: "King's Rest" },
  { id: 402007, name: 'Ruby Life Pools' },
  // Temple of Sethraliss intentionally omitted — this mock character hasn't
  // run it yet this season, exercising the "not run" empty state.
];

function keystoneRun(dungeon: { id: number; name: string }, level: number, timed: boolean, rating: number, daysAgo: number) {
  return {
    completed_timestamp: Date.now() - daysAgo * DAY_MS,
    duration: 1_680_000 + level * 12_000,
    keystone_level: level,
    is_completed_within_time: timed,
    dungeon,
    mythic_rating: { rating, color: { r: 255, g: 128, b: 0, a: 1 } },
    keystone_affixes: [
      { id: 9, name: 'Tyrannical' },
      { id: 10, name: 'Fortified' },
    ],
  };
}

export const MOCK_MYTHIC_KEYSTONE_SEASON: MythicKeystoneSeason = {
  season: { id: 18 },
  mythic_rating: { rating: 2487.3, color: { r: 255, g: 128, b: 0, a: 1 } },
  best_runs: [
    keystoneRun(S2_DUNGEONS[0], 11, true, 331.2, 1),
    keystoneRun(S2_DUNGEONS[1], 10, true, 318.6, 2),
    keystoneRun(S2_DUNGEONS[2], 10, true, 315.9, 3),
    keystoneRun(S2_DUNGEONS[3], 9, true, 302.4, 4),
    keystoneRun(S2_DUNGEONS[4], 9, false, 288.1, 5),
    keystoneRun(S2_DUNGEONS[5], 8, true, 296.7, 6),
    keystoneRun(S2_DUNGEONS[6], 7, true, 279.5, 7),
  ],
};

export function hasBlizzardCredentials(): boolean {
  return Boolean(process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET);
}
