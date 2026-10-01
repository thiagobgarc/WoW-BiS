import { describe, expect, it } from 'vitest';
import { loadAllSeeds, listSeededSpecs, specSlug } from './loadSeeds';
import { CURRENT_SEASON_ID } from '@/lib/season/seasonConfig';
import { SPEC_CATALOGUE } from '@/lib/ingest/specCatalogue';

/**
 * The six specs that were hand-authored before the ingest pipeline existed.
 * They are still asserted individually because they are the specs with a
 * curated stat priority and a configured tier set, so they are the ones whose
 * lists should be richest.
 */
const CURATED_SPECS = [
  { class: 'Paladin', spec: 'Retribution' },
  { class: 'Mage', spec: 'Fire' },
  { class: 'Druid', spec: 'Restoration' },
  { class: 'Hunter', spec: 'Beast Mastery' },
  { class: 'Death Knight', spec: 'Frost' },
  { class: 'Priest', spec: 'Discipline' },
];

const SINGULAR_SLOTS = [
  'head', 'neck', 'shoulder', 'back', 'chest', 'wrist',
  'hands', 'waist', 'legs', 'feet', 'main_hand', 'off_hand',
];

describe('BiS seed files', () => {
  it('covers every playable spec', async () => {
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    expect(lists).toHaveLength(SPEC_CATALOGUE.length);
  });

  it('still seeds the six originally curated specs', async () => {
    const seeded = await listSeededSpecs(CURRENT_SEASON_ID);
    const seededSlugs = new Set(seeded.map((s) => specSlug(s.class, s.spec)));
    for (const expected of CURATED_SPECS) {
      expect(seededSlugs.has(specSlug(expected.class, expected.spec))).toBe(true);
    }
  });

  it('uses real Blizzard item ids', async () => {
    // The hand-authored lists this replaced used sequential invented ids from
    // 340001, every one of which 404s against the item endpoint. That is what
    // broke item icons and Wowhead links on every BiS target.
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    const ids = lists.flatMap((l) => l.entries.map((e) => e.itemId));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.some((id) => id >= 340001 && id <= 340999)).toBe(false);
  });

  it('has a rank-1 target for every singular slot in at least one content type', async () => {
    // Deliberately not "in the raid". These lists are derived from the real
    // loot tables, and the season genuinely ships no plate raid shoulder —
    // plate specs get theirs from Mythic+ or from their tier set. Asserting
    // raid coverage would demand the data lie.
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    for (const list of lists) {
      for (const slot of SINGULAR_SLOTS) {
        const hasRank1 = list.entries.some((e) => e.slot === slot && e.rank === 1);
        expect(hasRank1, `${list.class} ${list.spec} has no rank-1 entry for ${slot}`).toBe(true);
      }
    }
  });

  it('pools at least two ranks for the dual slots', async () => {
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    for (const list of lists) {
      for (const slot of ['finger', 'trinket'] as const) {
        const ranks = list.entries.filter((e) => e.slot === slot && e.contentType === 'raid').map((e) => e.rank);
        expect(ranks, `${list.class} ${list.spec} ${slot} pool`).toEqual(expect.arrayContaining([1, 2]));
      }
    }
  });

  it('never ranks the same item twice within one slot and content type', async () => {
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    for (const list of lists) {
      const seen = new Set<string>();
      for (const e of list.entries) {
        const key = `${e.slot}:${e.contentType}:${e.rank}`;
        expect(seen.has(key), `${list.class} ${list.spec} duplicate ${key}`).toBe(false);
        seen.add(key);
      }
    }
  });
});
