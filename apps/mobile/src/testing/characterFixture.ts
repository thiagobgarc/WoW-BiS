/**
 * A whole `GET /v1/character/...` payload, for tests that need a character
 * on screen.
 *
 * Built through the contract's own schema at the bottom of this file, so a
 * fixture that drifts out of shape fails here rather than passing a screen
 * test with data the server could never send. That is the same discipline
 * the client applies at runtime, applied to the test data.
 *
 * Deliberately not a "perfect" character: one slot is empty, one has an
 * unfilled socket, three of five tier pieces are equipped, and one dungeon
 * has no run. Every one of those is a branch some component renders
 * differently, and a fixture where everything is present exercises none of
 * them.
 */
import { CharacterResponseSchema, type CharacterResponse } from '@mythos/api-contract';
import type { DomainItem, EquipmentSlot } from '@mythos/core/character';

function item(slot: EquipmentSlot, overrides: Partial<DomainItem> = {}): DomainItem {
  return {
    slot,
    itemId: 200000 + slot.length,
    name: `${slot} of the Abyss`,
    quality: 'epic',
    itemLevel: 636,
    iconUrl: `https://render.example/${slot}.jpg`,
    isTierPiece: false,
    isEmbellishment: false,
    sockets: [],
    enchantText: null,
    wowheadUrl: `https://www.wowhead.com/item=${200000 + slot.length}`,
    bindingText: 'Soulbound',
    armorTypeLabel: 'Plate',
    armorLine: { text: '2,340 Armor', color: '#ffffff' },
    weaponLines: [],
    stats: [{ text: '+1,204 Strength', color: '#ffffff' }],
    procs: [],
    requiredLevelText: 'Requires Level 80',
    classesText: null,
    setInfo: null,
    ...overrides,
  };
}

export const CHARACTER_FIXTURE: CharacterResponse = CharacterResponseSchema.parse({
  character: {
    name: 'Arthas',
    realmSlug: 'illidan',
    realmName: 'Illidan',
    region: 'us',
    className: 'Death Knight',
    classSlug: 'death-knight',
    specName: 'Unholy',
    specId: 252,
    faction: 'HORDE',
    guildName: 'Scourge',
    level: 80,
    averageItemLevel: 638,
    equippedItemLevel: 636,
    lastLoginTimestamp: 1_757_000_000_000,
  },
  equipment: {
    head: item('head', { isTierPiece: true, name: 'Helm of the Damned' }),
    neck: item('neck', {
      name: 'Choker of the Abyss',
      sockets: [{ filled: true, gemName: 'Culminating Ruby' }, { filled: false }],
    }),
    shoulder: item('shoulder', { isTierPiece: true }),
    chest: item('chest', { isTierPiece: true }),
    waist: item('waist', { isEmbellishment: true }),
    legs: item('legs'),
    feet: item('feet'),
    wrist: item('wrist'),
    hands: item('hands'),
    finger_1: item('finger_1'),
    finger_2: item('finger_2'),
    trinket_1: item('trinket_1', { procs: ['Use: Deal 40,000 Shadow damage.'] }),
    trinket_2: item('trinket_2'),
    back: item('back'),
    main_hand: item('main_hand', {
      name: 'Frostmourne',
      weaponLines: ['1,204 - 1,806 Damage', 'Speed 3.60'],
      enchantText: 'Enchanted: Rune of the Fallen Crusader',
    }),
    // off_hand is deliberately absent — the paper doll has to render an
    // empty tile for a slot the payload simply omits.
  },
  stats: {
    haste: { rating: 4210, percent: 21.4 },
    crit: { rating: 3980, percent: 19.8 },
    mastery: { rating: 5120, percent: 34.2 },
    versatility: { rating: 1240, percent: 6.2 },
  },
  avatarUrl: 'https://render.example/arthas.jpg',
  mock: false,
  fetchedAt: 1_757_000_000_000,
  stale: false,
  bis: {
    entries: [],
    seeded: true,
    statPriority: ['mastery', 'haste', 'crit', 'versatility'],
  },
  talents: null,
  recommendedTalents: null,
  progression: {
    raid: {
      instanceName: 'The Venomous Abyss',
      difficulties: [
        { difficulty: 'LFR', label: 'Raid Finder', killed: 8, total: 8, bosses: [
          { name: 'Sylvara', killed: true, killCount: 3, lastKillTimestamp: 1_756_900_000_000 },
        ] },
        { difficulty: 'NORMAL', label: 'Normal', killed: 6, total: 8, bosses: [
          { name: 'Sylvara', killed: true, killCount: 1, lastKillTimestamp: 1_756_900_000_000 },
          { name: 'The Hollow Queen', killed: false, killCount: 0, lastKillTimestamp: null },
        ] },
        { difficulty: 'HEROIC', label: 'Heroic', killed: 2, total: 8, bosses: [
          { name: 'Sylvara', killed: true, killCount: 1, lastKillTimestamp: 1_756_800_000_000 },
          { name: 'The Hollow Queen', killed: false, killCount: 0, lastKillTimestamp: null },
        ] },
        { difficulty: 'MYTHIC', label: 'Mythic', killed: 0, total: 8, bosses: [
          { name: 'Sylvara', killed: false, killCount: 0, lastKillTimestamp: null },
        ] },
      ],
    },
    mythicPlus: {
      rating: 2412.6,
      dungeons: [
        {
          dungeon: 'Ara-Kara, City of Echoes',
          run: { level: 12, timed: true, score: 212.4, durationMs: 1_624_000, completedAt: 1_756_900_000_000 },
        },
        { dungeon: 'The Dawnbreaker', run: null },
      ],
    },
  },
  metaTier: 'A',
});

/** The same character, as the server describes a snapshot it couldn't refresh. */
export function staleFixture(fetchedAt: number): CharacterResponse {
  return { ...CHARACTER_FIXTURE, stale: true, fetchedAt };
}
