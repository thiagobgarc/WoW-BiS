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
 * sources each). The BiS gear seed content under /data/bis/midnight-s2/
 * has since been re-authored for this season too — see the README
 * "Status" section.
 *
 * Updated again 2026-09-01: the ilvl tables below (raid difficulty bands,
 * M+ key-level table, crafted caps) were PROVISIONAL as of the prior
 * update — Blizzard hadn't shipped final Season 2 numbers yet. Real
 * numbers are now live and cross-checked across Method.gg's upgrade-track
 * table, mythic-store.com's Great Vault breakdown, and timesaver.gg's
 * gearing chart (self-consistent with each other: Champion 1/6 = 292 =
 * Normal raid base = M+ dungeon base; Hero 1/6 = 305 = Heroic raid base;
 * Myth 1/6 = 318 = Mythic raid base = +10 Vault). Track structure is
 * Champion (292-308) -> Hero (305-321) -> Myth (318-334), with the final
 * two Mythic raid bosses dropping above the track cap at 344.
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
    // Base (first-boss) ilvl per difficulty; loot climbs within a raid as
    // you clear later bosses (e.g. Mythic runs 318 -> 321 -> 324, with the
    // final two bosses dropping the 344 ceiling) — this app only models
    // one number per difficulty, not per-boss progression.
    difficultyIlvl: {
      lfr: 279,
      normal: 292,
      heroic: 305,
      mythic: 318,
    },
    // Warcraft Logs encounter ids the raid BiS samples top Mythic parsers
    // from (zone 53). Early bosses on purpose: they have 100+ Mythic parses
    // per spec, while the last bosses have few or no kills yet (Kith'ix: 0
    // as of 2026-10-04). Gear is read from Blizzard afterwards, so which boss
    // a player parsed on does not bias the items, only who gets sampled.
    warcraftLogsEncounterIds: [3470, 3455],
    // Bosses the raid tier list measures throughput on (scripts/
    // ingest-tier-lists.ts): the first four, which every spec has Mythic
    // parses on. The same set for every spec keeps the comparison fair, and
    // later bosses join as kills accumulate.
    warcraftLogsTierEncounterIds: [3470, 3445, 3497, 3455],
    // Separate one-boss raid (Nymrissa Wavecaller) whose loot top players
    // wear — e.g. Rising Tide Wristguards. Without it those items had no
    // source at all.
    additionalInstances: ['The Tidebound Grotto'],
  },
  // Raider.IO's season slug, for the per-spec Mythic+ player rankings.
  raiderIoSeason: 'season-mn-2',
  mythicPlus: {
    // Blizzard's internal numeric Mythic+ season id, needed to call
    // GET .../mythic-keystone-profile/season/{id}. Determined empirically
    // (2026-09-01), not guessed: GET /data/wow/mythic-keystone/season/index
    // lists ids 1-15,17,18 (16 is absent/skipped by Blizzard); season 18's
    // start_timestamp is 2026-08-11, closest to and just before this
    // season's real 2026-08-18 launch, and GET
    // /data/wow/mythic-keystone/period/index's current_period (1078) falls
    // inside season 18's period list (1076-1078) — both confirm 18 is the
    // live current season as of this writing.
    blizzardSeasonId: 18,
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
    // End-of-dungeon reward ilvl by keystone level. Caps at Hero 3/6 (311)
    // from +10 up — pushing higher keys raises rating/Mistcrest income,
    // not the loot ceiling, so 10/11/12 are intentionally flat.
    ilvlByKeyLevel: {
      2: 295,
      4: 298,
      6: 305,
      7: 305,
      8: 308,
      9: 308,
      10: 311,
      11: 311,
      12: 311,
    } as Record<number, number>,
    // Great Vault ilvl by the single highest key timed that week. Caps at
    // Myth 1/6 (318) from +10 up, same flat-cap behavior as above.
    vaultIlvlByKeyLevel: {
      2: 305,
      4: 308,
      6: 311,
      8: 315,
      10: 318,
    } as Record<number, number>,
  },
  // baseIlvl is a Spark-only craft with no crest reagents (292, matching
  // Champion 1/6). Spending Mistcrests climbs it further: Hero Mistcrests
  // reach 305-318, then Myth Mistcrests reach 318-331 — sparkUpgradeIlvlCaps
  // below models that final Myth-Mistcrest climb, ranks 1/6 through 5/6.
  // Crafted gear caps one rank below the track ceiling (331, not 334);
  // reaching 334+ requires Ascendant Venomstones on top of a crafted piece.
  crafted: {
    baseIlvl: 292,
    sparkUpgradeIlvlCaps: {
      1: 318,
      2: 321,
      3: 324,
      4: 328,
      5: 331,
    } as Record<1 | 2 | 3 | 4 | 5, number>,
  },
  // As of 12.1, Catalyst charges (Crystallized Venomblight Manafluxes) come
  // one per two weeks (not per week), capped at 8 banked — chargesPerWeek
  // is kept as an averaged rate (0.5) since nothing in the app currently
  // reads it on a weekly cadence. Also as of 12.1, the Catalyst no longer
  // outputs a fixed ilvl: a catalyzed piece keeps the ilvl (and now also
  // the secondary stats/cantrips) of the item you fed in. outputIlvl below
  // is therefore not a real fixed value — it's left as a representative
  // "typical Hero-track catalyst input" figure for any code/UI that wants
  // a placeholder number; it should not be treated as authoritative.
  catalyst: {
    chargesPerWeek: 0.5,
    outputIlvl: 311,
  },
  // PLACEHOLDER: which slots can carry a crafted embellishment rotates by
  // season/patch and isn't exposed cleanly by the API. Season 2 added new
  // embellishments (per Method.gg's embellishment list) that appear to
  // span more slots than S1's shoulder/back rotation (cloaks, weapons, and
  // per-profession slots like boots are mentioned), but no source gives a
  // clean, confirmed slot list to replace this with — left unchanged
  // rather than guess. One-line change once S2's actual rotation is found.
  embellishableSlots: ['shoulder', 'back'] as const,
  enchantableSlots: ['back', 'chest', 'wrist', 'legs', 'feet', 'main_hand', 'off_hand', 'finger_1', 'finger_2'] as const,
  // One tier set per class, shared by all its specs. Names are Blizzard's own
  // item sets 2055-2067 (verified against /data/wow/item-set), so every spec
  // gets its tier pieces. Bonus text is per spec and lives in tierSets below.
  classTierSets: {
    'Death Knight': "Baleful Grave-Knight's Crucible",
    'Demon Hunter': "Abyssal Doomhound's Pursuit",
    Druid: 'Bark of the Enigmatic Dreamwatcher',
    Evoker: 'Echo of Calamity',
    Hunter: "Skulking Viper's Ambush",
    Mage: "Primal Leywarden's Attire",
    Monk: 'Guile of the Monkey King',
    Paladin: 'Radiance of the Consecrated Flame',
    Priest: "Cosmic Penitent's Raiment",
    Rogue: "Chosen Bloodslayer's Hexweave",
    Shaman: "Ophidian Oracle's Prophecy",
    Warlock: "Damned Necrolyte's Shattered Restraints",
    Warrior: "Jade Warlord's Dominion",
  } as Record<string, string>,
  tierSets: {
    // Per-spec 2pc/4pc bonus text, keyed by "{class}-{spec}" slug. Only these
    // six are researched (Icy Veins / Maxroll / aoeah.com, cross-checked).
    // Blizzard's item-set endpoint is no substitute: it returns ONE spec's
    // bonuses per class set (the Death Knight set reports Unholy's), so using
    // it would show other specs the wrong bonus.
    'paladin-retribution': { name: 'Radiance of the Consecrated Flame', '2pc': 'Divine Purpose has an additional 10% chance to activate; consuming it grants Divine Power.', '4pc': 'Consuming Divine Purpose with Divine Storm causes your next Final Verdict to be free.' },
    'mage-fire': { name: "Primal Leywarden's Attire", '2pc': 'Pyroclasm causes Flame Strike and Pyroblast to always critically strike.', '4pc': 'Pyroclasm reduces the cast time of Flame Strike and Pyroblast by 20% and increases their damage bonus.' },
    'druid-restoration': { name: 'Bark of the Enigmatic Dreamwatcher', '2pc': 'Rejuvenation has a 15% chance to grant Genesis, causing all your HoTs to heal for 25% more.', '4pc': "Genesis's duration is increased by 4 sec, and gaining Genesis grants Clearcasting." },
    'hunter-beast-mastery': { name: "Skulking Viper's Ambush", '2pc': 'Barbed Shot causes your pet to Stomp one additional time at 50% effectiveness.', '4pc': 'Stomp causes your next Cobra Shot to benefit from Beast Cleave.' },
    'death-knight-frost': { name: "Baleful Grave-Knight's Crucible", '2pc': 'Each time Remorseless Winter damages at least one enemy, you gain a stack of Frozen Tempest.', '4pc': 'Remorseless Winter deals damage 25% more frequently, and Frozen Tempest lasts 5 sec longer.' },
    'priest-discipline': { name: "Cosmic Penitent's Raiment", '2pc': 'Penance damage and healing increased by 20%. Casting Penance reduces the cooldown of Mind Blast.', '4pc': 'After casting Mind Blast, your next Power Word: Shield or Void Shield absorbs 25% more.' },
  } as Record<string, { name: string; '2pc': string; '4pc': string }>,
};

export type SeasonConfig = typeof seasonConfig;
