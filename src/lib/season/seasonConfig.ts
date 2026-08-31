/**
 * Single source of truth for everything that changes when the season
 * rolls over: raid name, difficulty ilvl bands, M+ key-level ilvl table,
 * crafted ilvl caps, tier bonus text. Nothing season-specific should be
 * hardcoded anywhere else in the app — when a new season ships, this is
 * the one file to edit (plus dropping new seed JSON in /data/bis/{seasonId}).
 *
 * Updated 2026-08-25 to the real current season: Midnight Season 2,
 * patch 12.1.0 "The Curse of Ula'tek" (launched 2026-08-18). This replaces
 * the earlier `midnight-s1-placeholder` structure, which reused The War
 * Within Season 1's Nerub-ar Palace data verbatim as realistic placeholder
 * content because real Midnight data wasn't public yet. Raid/dungeon
 * names and tier set names below are sourced from live guides (Wowhead,
 * Blizzard news post, Icy Veins, Maxroll, Method — cross-checked 2+
 * sources each). NOTE: the actual BiS gear seed *content* under
 * /data/bis/midnight-s2/ has NOT been re-authored for this season — see
 * the README "Known limitations" section. This file only fixes the
 * season metadata/structure.
 */

export const CURRENT_SEASON_ID = 'midnight-s2';

export const seasonConfig = {
  id: CURRENT_SEASON_ID,
  displayName: 'Midnight Season 2',
  raid: {
    name: 'The Venomous Abyss',
    bosses: [
      "Nek'zali the Soulcoiler",
      'Entombed Sentinels',
      'The Lost Explorers',
      'Vashnik the Malignant',
      "Sszorak",
      'The Twin Fangs',
      'The Coiled Altar',
      "Ula'tek",
    ],
    // PROVISIONAL: raid difficulty ilvl bands for Season 2 were still moving
    // on the PTR at the time of this update ("higher item-level growth than
    // the original plan" per Blizzard, exact numbers not yet published).
    // Carrying forward the Season 1 band structure/spacing as a placeholder
    // until Blizzard's official numbers are confirmed — treat these as
    // wrong in absolute terms, right only in relative shape.
    difficultyIlvl: {
      lfr: 476,
      normal: 489,
      heroic: 502,
      mythic: 515,
    },
  },
  mythicPlus: {
    // Confirmed via Wowhead/Method/timesaver.gg: Season 2's 8-dungeon pool
    // combines 5 Midnight dungeons not featured in Season 1 with 3 returning
    // instances (BfA x2, Dragonflight x1).
    dungeons: [
      'Altar of Fangs',
      'Murder Row',
      'Den of Nalorakk',
      'The Blinding Vale',
      'Voidscar Arena',
      "King's Rest",
      'Ruby Life Pools',
      'Temple of Sethraliss',
    ],
    // PROVISIONAL: same caveat as raid.difficultyIlvl above — no source
    // found publishing confirmed Season 2 M+ ilvl-by-keylevel numbers yet.
    // Keeping Season 1's table as placeholder shape pending official values.
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
    // PROVISIONAL — see ilvlByKeyLevel note above.
    vaultIlvlByKeyLevel: {
      2: 489,
      4: 496,
      6: 502,
      8: 509,
      10: 515,
    } as Record<number, number>,
  },
  // PROVISIONAL: no confirmed Season 2 numbers found; carrying Season 1's
  // values forward as placeholder shape (see ilvlByKeyLevel note above).
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
  // PROVISIONAL — see crafted note above.
  catalyst: {
    chargesPerWeek: 2,
    outputIlvl: 502,
  },
  // PLACEHOLDER: which slots can carry a crafted embellishment rotates by
  // season/patch and isn't exposed cleanly by the API — no Season 2 source
  // found confirming a change from Season 1, so carried forward unchanged.
  // One-line change when Midnight S2's actual rotation is confirmed.
  embellishableSlots: ['shoulder', 'back'] as const,
  enchantableSlots: ['back', 'chest', 'wrist', 'legs', 'feet', 'main_hand', 'off_hand', 'finger_1', 'finger_2'] as const,
  tierSets: {
    // Keyed by "{class}-{spec}" slug, matches BiS seed file naming.
    // Set names and 2pc/4pc bonus text below are the real Season 2 tier
    // sets (sourced from Icy Veins / Maxroll / aoeah.com, cross-checked),
    // dropping from The Venomous Abyss, the Great Vault, the Midnight
    // Catalyst, and PvP.
    'paladin-retribution': { name: 'Radiance of the Consecrated Flame', '2pc': 'Divine Purpose has an additional 10% chance to activate; consuming it grants Divine Power.', '4pc': 'Consuming Divine Purpose with Divine Storm causes your next Final Verdict to be free.' },
    'mage-fire': { name: "Primal Leywarden's Attire", '2pc': 'Pyroclasm causes Flame Strike and Pyroblast to always critically strike.', '4pc': 'Pyroclasm reduces the cast time of Flame Strike and Pyroblast by 20% and increases their damage bonus.' },
    'druid-restoration': { name: 'Bark of the Enigmatic Dreamwatcher', '2pc': 'Rejuvenation has a 15% chance to grant Genesis, causing all your HoTs to heal for 25% more.', '4pc': "Genesis's duration is increased by 4 sec, and gaining Genesis grants Clearcasting." },
    'hunter-beast-mastery': { name: "Skulking Viper's Ambush", '2pc': 'Barbed Shot causes your pet to Stomp one additional time at 50% effectiveness.', '4pc': 'Stomp causes your next Cobra Shot to benefit from Beast Cleave.' },
    'death-knight-frost': { name: "Baleful Grave-Knight's Crucible", '2pc': 'Each time Remorseless Winter damages at least one enemy, you gain a stack of Frozen Tempest.', '4pc': 'Remorseless Winter deals damage 25% more frequently, and Frozen Tempest lasts 5 sec longer.' },
    'priest-discipline': { name: "Cosmic Penitent's Raiment", '2pc': 'Penance damage and healing increased by 20%. Casting Penance reduces the cooldown of Mind Blast.', '4pc': 'After casting Mind Blast, your next Power Word: Shield or Void Shield absorbs 25% more.' },
  } as Record<string, { name: string; '2pc': string; '4pc': string }>,
};

export type SeasonConfig = typeof seasonConfig;
