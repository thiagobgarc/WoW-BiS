import { describe, expect, it } from 'vitest';
import { loadAllSeeds, listSeededSpecs, specSlug } from './loadSeeds';
import { CURRENT_SEASON_ID } from '@/lib/season/seasonConfig';

const EXPECTED_SPECS = [
  { class: 'Paladin', spec: 'Retribution' },
  { class: 'Mage', spec: 'Fire' },
  { class: 'Druid', spec: 'Restoration' },
  { class: 'Hunter', spec: 'Beast Mastery' },
  { class: 'Death Knight', spec: 'Frost' },
  { class: 'Priest', spec: 'Discipline' },
];

describe('BiS seed files', () => {
  it('loads and schema-validates all 6 seeded specs', async () => {
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    expect(lists).toHaveLength(6);
  });

  it('seeds exactly the 6 specs named in the product spec', async () => {
    const seeded = await listSeededSpecs(CURRENT_SEASON_ID);
    const seededSlugs = new Set(seeded.map((s) => specSlug(s.class, s.spec)));
    for (const expected of EXPECTED_SPECS) {
      expect(seededSlugs.has(specSlug(expected.class, expected.spec))).toBe(true);
    }
  });

  it('every entry has a rank-1 target for every singular slot, and a finger/trinket pool', async () => {
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    for (const list of lists) {
      const raidEntries = list.entries.filter((e) => e.contentType === 'raid');
      const singularSlots = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'main_hand', 'off_hand'];
      for (const slot of singularSlots) {
        const hasRank1 = raidEntries.some((e) => e.slot === slot && e.rank === 1);
        expect(hasRank1, `${list.class} ${list.spec} missing rank-1 raid entry for ${slot}`).toBe(true);
      }
      const fingerRanks = raidEntries.filter((e) => e.slot === 'finger').map((e) => e.rank);
      expect(fingerRanks, `${list.class} ${list.spec} finger pool`).toEqual(expect.arrayContaining([1, 2]));
      const trinketRanks = raidEntries.filter((e) => e.slot === 'trinket').map((e) => e.rank);
      expect(trinketRanks, `${list.class} ${list.spec} trinket pool`).toEqual(expect.arrayContaining([1, 2]));
    }
  });
});
