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

/**
 * off_hand is not here: two-hander and ranged specs legitimately have no
 * off-hand target. It used to be, and every spec passed only because agility
 * and strength specs were all handed an intellect off-hand frill. The
 * weapon-setup test below covers off_hand instead.
 */
const SINGULAR_SLOTS = [
  'head', 'neck', 'shoulder', 'back', 'chest', 'wrist',
  'hands', 'waist', 'legs', 'feet', 'main_hand',
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

  /**
   * Regression: Enhancement Shaman's list was a copy of Elemental's, intellect
   * weapons included. Some sharing is legitimate (an INT/AGI warglaive suits
   * both Devourer and Havoc), so this asserts the lists differ, and leaves
   * per-item primary checks to isUsableBySpec's unit tests.
   */
  it('never gives specs with different primary stats the same weapons', async () => {
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    const weapons = (cls: string, spec: string) =>
      JSON.stringify(
        lists
          .find((l) => l.class === cls && l.spec === spec)!
          .entries.filter((e) => e.slot === 'main_hand' || e.slot === 'off_hand')
          .map((e) => e.itemId)
          .sort(),
      );
    for (const a of SPEC_CATALOGUE) {
      for (const b of SPEC_CATALOGUE) {
        if (a.class !== b.class || a.primaryStat === b.primaryStat) continue;
        expect(weapons(a.class, a.spec), `${a.class} ${a.spec} vs ${b.spec}`).not.toBe(weapons(b.class, b.spec));
      }
    }
  });

  /** Regression: Ret and Arms were offered shields, dual wielders no second weapon. */
  it('lists an off-hand exactly for the specs whose weapon setup has one', async () => {
    const lists = await loadAllSeeds(CURRENT_SEASON_ID);
    const has = (cls: string, spec: string) =>
      lists.find((l) => l.class === cls && l.spec === spec)!.entries.some((e) => e.slot === 'off_hand');

    for (const [cls, spec] of [['Paladin', 'Retribution'], ['Warrior', 'Arms'], ['Death Knight', 'Blood'], ['Hunter', 'Marksmanship'], ['Monk', 'Windwalker']]) {
      expect(has(cls!, spec!), `${cls} ${spec} should have no off-hand`).toBe(false);
    }
    for (const [cls, spec] of [['Shaman', 'Enhancement'], ['Rogue', 'Outlaw'], ['Demon Hunter', 'Havoc'], ['Warrior', 'Fury'], ['Warrior', 'Protection'], ['Paladin', 'Protection']]) {
      expect(has(cls!, spec!), `${cls} ${spec} should have an off-hand`).toBe(true);
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
