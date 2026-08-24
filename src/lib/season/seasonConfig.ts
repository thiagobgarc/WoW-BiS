/**
 * Single source of truth for everything that changes when the season
 * rolls over: raid name, difficulty ilvl bands, M+ key-level ilvl table,
 * crafted ilvl caps, tier bonus text. Nothing season-specific should be
 * hardcoded anywhere else in the app — when a new season ships, this is
 * the one file to edit (plus dropping new seed JSON in /data/bis/{seasonId}).
 *
 * PLACEHOLDER: Midnight (12.x) season 1 raid/dungeon names are not public
 * at the time this was written. The values below reuse The War Within
 * Season 1 content (Nerub-ar Palace) purely as realistic placeholder
 * structure — matching the supplied UI mockup — so the layout and data
 * pipeline are provable end to end. Swap every field here once real
 * Midnight season data is announced; nothing else needs to change.
 */

export const CURRENT_SEASON_ID = 'midnight-s1-placeholder';

export const seasonConfig = {
  id: CURRENT_SEASON_ID,
  displayName: 'Midnight Season 1 (placeholder data)',
  raid: {
    name: 'Nerub-ar Palace',
    bosses: [
      'Ulgrax the Defiler',
      'The Bloodbound Horror',
      'Sikran, Captain of the Sureki',
      'Rasha\'nan',
      'Broodtwister Ovi\'nax',
      'Nexus-Princess Ky\'veza',
      'The Silken Court',
      'Queen Ansurek',
    ],
    difficultyIlvl: {
      lfr: 476,
      normal: 489,
      heroic: 502,
      mythic: 515,
    },
  },
  mythicPlus: {
    dungeons: [
      'Ara-Kara, City of Echoes',
      'City of Threads',
      'The Stonevault',
      'Mists of Tirna Scithe',
      'The Dawnbreaker',
      'Cinderbrew Meadery',
      'Darkflame Cleft',
      'Siege of Boralus',
    ],
    ilvlByKeyLevel: {
      2: 476,
      4: 483,
      6: 489,
      7: 493,
      8: 496,
      9: 499,
      10: 502,
      11: 505,
      12: 509,
    } as Record<number, number>,
    vaultIlvlByKeyLevel: {
      2: 489,
      4: 496,
      6: 502,
      8: 509,
      10: 515,
    } as Record<number, number>,
  },
  crafted: {
    baseIlvl: 476,
    sparkUpgradeIlvlCaps: {
      1: 480,
      2: 490,
      3: 496,
      4: 502,
      5: 509,
    } as Record<1 | 2 | 3 | 4 | 5, number>,
  },
  catalyst: {
    chargesPerWeek: 2,
    outputIlvl: 502,
  },
  // PLACEHOLDER: which slots can carry a crafted embellishment rotates by
  // season/patch and isn't exposed cleanly by the API — hardcoded here so
  // it's a one-line change when Midnight's actual rotation is known.
  embellishableSlots: ['shoulder', 'back'] as const,
  enchantableSlots: ['back', 'chest', 'wrist', 'legs', 'feet', 'main_hand', 'off_hand', 'finger_1', 'finger_2'] as const,
  tierSets: {
    // Keyed by "{class}-{spec}" slug, matches BiS seed file naming.
    'paladin-retribution': { name: "Radiant Aspirant's Battlegear", '2pc': 'Templar\'s Verdict deals 15% more damage.', '4pc': 'Wake of Ashes cooldown reduced by 20% and grants a stack of Holy Power.' },
    'mage-fire': { name: "Firebrand's Vestments", '2pc': 'Fire Blast damage increased by 20%.', '4pc': 'Combustion duration increased by 4 sec and grants a burst of Mastery.' },
    'druid-restoration': { name: "Dreamtender's Vestments", '2pc': 'Rejuvenation critical heals grant a stack of Harmony.', '4pc': 'Wild Growth healing increased by 25% per active Harmony stack.' },
    'hunter-beast-mastery': { name: "Sentinel's Wildhunt Battlegear", '2pc': "Barbed Shot duration increased by 2 sec.", '4pc': 'Bestial Wrath grants your pet 15% haste for its duration.' },
    'death-knight-frost': { name: "Deathbringer's Battleplate", '2pc': 'Obliterate has a 15% chance to grant a Rime proc.', '4pc': 'Pillar of Frost increases damage by an additional 15%.' },
    'priest-discipline': { name: "Vestments of the Silken Court", '2pc': 'Power Word: Radiance duration on Atonement increased by 3 sec.', '4pc': 'Penance critical heals grant a stack of Harsh Discipline.' },
  } as Record<string, { name: string; '2pc': string; '4pc': string }>,
};

export type SeasonConfig = typeof seasonConfig;
