/**
 * The BiS half of `CHARACTER_FIXTURE`, and the upgrade board's whole world.
 *
 * Split out of `characterFixture.ts` because it is the longer half and it
 * is authored to a different brief: every entry here exists to put one
 * branch of `compareGear`/`deriveActionGroups` on screen. Between them the
 * raid list produces all four severities, both dual-slot categories, a row
 * with alternatives and a row with none, and one of each action group —
 * boss, dungeon, craft, catalyst.
 *
 * Deliberately *not* seeded for PvP. Two of three content types is what a
 * real seed file looks like, and the empty segment is a state the board has
 * to render as normal rather than as an error.
 *
 * The equipped item ids come from `characterFixture`'s own `item()` helper,
 * which derives them from the slot name — so `EQUIPPED_ITEM_ID` below is
 * how an entry says "the player already has this one" without either file
 * hardcoding a number the other could change.
 */
import type { BisEntry } from '@mythos/core/bis';

/** Mirrors `item()` in characterFixture.ts — one definition, two callers. */
export function fixtureItemId(slot: string): number {
  return 200_000 + [...slot].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

const RAID = 'The Venomous Abyss';

const RAID_ENTRIES: BisEntry[] = [
  {
    // Already equipped: the 'bis' severity, and the row that renders no
    // target block at all.
    slot: 'head',
    contentType: 'raid',
    rank: 1,
    itemId: fixtureItemId('head'),
    itemName: 'Helm of the Damned',
    itemLevel: 636,
    source: { type: 'raid', instance: RAID, boss: 'Sylvara', difficulty: 'heroic' },
    tierPiece: true,
    catalystable: false,
    statPriorityFit: 96,
  },
  {
    // +4 iLvl — 'close', the severity that has to survive being neither a
    // problem nor a match.
    slot: 'back',
    contentType: 'raid',
    rank: 1,
    itemId: 299_011,
    itemName: 'Drape of the Drowned',
    itemLevel: 640,
    source: { type: 'dungeon', dungeon: 'Ara-Kara, City of Echoes', keyLevel: 10 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 82,
  },
  {
    // +12 iLvl — 'upgrade'.
    slot: 'main_hand',
    contentType: 'raid',
    rank: 1,
    itemId: 299_001,
    itemName: 'Edge of the Abyss',
    itemLevel: 648,
    source: { type: 'raid', instance: RAID, boss: 'The Hollow Queen', difficulty: 'heroic' },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 94,
  },
  {
    // +24 iLvl — 'major-gap' with something equipped.
    slot: 'chest',
    contentType: 'raid',
    rank: 1,
    itemId: 299_002,
    itemName: 'Chestplate of the Venom Court',
    itemLevel: 660,
    source: { type: 'raid', instance: RAID, boss: 'Sylvara', difficulty: 'heroic' },
    tierPiece: true,
    catalystable: true,
    statPriorityFit: 91,
  },
  {
    // 'major-gap' with *nothing* equipped — the fixture omits off_hand.
    slot: 'off_hand',
    contentType: 'raid',
    rank: 1,
    itemId: 299_003,
    itemName: 'Bulwark of the Deep',
    itemLevel: 648,
    source: { type: 'dungeon', dungeon: 'Ara-Kara, City of Echoes', keyLevel: 10 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 78,
  },
  // Rings: rank 1 is already on the character, so the 2x2 assignment has to
  // credit it in whichever slot holds it and put rank 2 against the other.
  // Rank 3 is the alternatives disclosure.
  {
    slot: 'finger',
    contentType: 'raid',
    rank: 1,
    itemId: fixtureItemId('finger_1'),
    itemName: 'Band of the Abyss',
    // Equal to the equipped copy's 636: a lower-ilvl copy isn't BiS.
    itemLevel: 636,
    source: { type: 'raid', instance: RAID, boss: 'Sylvara', difficulty: 'mythic' },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 88,
  },
  {
    slot: 'finger',
    contentType: 'raid',
    rank: 2,
    itemId: 299_004,
    itemName: 'Loop of Coiled Fangs',
    itemLevel: 645,
    source: { type: 'dungeon', dungeon: 'The Dawnbreaker', keyLevel: 10 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 85,
  },
  {
    slot: 'finger',
    contentType: 'raid',
    rank: 3,
    itemId: 299_005,
    itemName: 'Signet of Whispers',
    itemLevel: 642,
    source: { type: 'vault' },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 80,
  },
  {
    slot: 'trinket',
    contentType: 'raid',
    rank: 1,
    itemId: 299_006,
    itemName: 'Vial of Venom',
    itemLevel: 645,
    source: { type: 'raid', instance: RAID, boss: 'The Hollow Queen', difficulty: 'heroic' },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 93,
  },
  {
    slot: 'trinket',
    contentType: 'raid',
    rank: 2,
    itemId: 299_007,
    itemName: 'Hollow Heart',
    itemLevel: 645,
    source: { type: 'dungeon', dungeon: 'The Dawnbreaker', keyLevel: 10 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 90,
  },
  {
    // The craft action group.
    slot: 'waist',
    contentType: 'raid',
    rank: 1,
    itemId: 299_009,
    itemName: 'Girdle of Woven Fangs',
    itemLevel: 645,
    source: { type: 'crafted', craftQuality: 5 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 87,
  },
  {
    // The catalyst action group.
    slot: 'shoulder',
    contentType: 'raid',
    rank: 1,
    itemId: 299_010,
    itemName: 'Mantle of the Consecrated',
    itemLevel: 648,
    source: { type: 'catalyst' },
    tierPiece: true,
    catalystable: true,
    statPriorityFit: 89,
  },
  {
    // Target *below* what is equipped — a Great Vault drop that out-levels
    // the list. compareGear calls that 'close' with a negative delta, which
    // is the row that would otherwise print "+-6 iLvl".
    slot: 'neck',
    contentType: 'raid',
    rank: 1,
    itemId: 299_012,
    itemName: 'Torc of the Silent Court',
    itemLevel: 630,
    source: { type: 'vault' },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 84,
  },
];

/** Shorter on purpose: switching segments must change the board, not just relabel it. */
const MYTHIC_PLUS_ENTRIES: BisEntry[] = [
  {
    slot: 'head',
    contentType: 'mythic-plus',
    rank: 1,
    itemId: 299_020,
    itemName: 'Cowl of the Deep Delve',
    itemLevel: 645,
    source: { type: 'dungeon', dungeon: 'Ara-Kara, City of Echoes', keyLevel: 12 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 92,
  },
  {
    slot: 'legs',
    contentType: 'mythic-plus',
    rank: 1,
    itemId: 299_021,
    itemName: 'Legguards of the Sunless',
    itemLevel: 645,
    source: { type: 'dungeon', dungeon: 'The Dawnbreaker', keyLevel: 12 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 86,
  },
  {
    slot: 'trinket',
    contentType: 'mythic-plus',
    rank: 1,
    itemId: 299_022,
    itemName: 'Whispering Charm',
    itemLevel: 642,
    source: { type: 'dungeon', dungeon: 'Ara-Kara, City of Echoes', keyLevel: 12 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 91,
  },
  {
    slot: 'trinket',
    contentType: 'mythic-plus',
    rank: 2,
    itemId: 299_023,
    itemName: 'Ember Core',
    itemLevel: 642,
    source: { type: 'dungeon', dungeon: 'The Dawnbreaker', keyLevel: 12 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 88,
  },
  {
    // Exactly one ring, on purpose: a dual-slot category with a single
    // target leaves the second physical slot with no target at all, which
    // is the only way to reach that branch of the row.
    slot: 'finger',
    contentType: 'mythic-plus',
    rank: 1,
    itemId: 299_024,
    itemName: 'Band of the Sunless Deep',
    itemLevel: 645,
    source: { type: 'dungeon', dungeon: 'The Dawnbreaker', keyLevel: 12 },
    tierPiece: false,
    catalystable: false,
    statPriorityFit: 83,
  },
];

export const BIS_ENTRIES: BisEntry[] = [...RAID_ENTRIES, ...MYTHIC_PLUS_ENTRIES];

/** What `/v1/meta` carries for the season the fixture describes. */
export const SEASON_SLOTS = {
  enchantableSlots: ['back', 'chest', 'wrist', 'legs', 'feet', 'main_hand', 'off_hand'],
  embellishableSlots: ['shoulder', 'back'],
} as const;
