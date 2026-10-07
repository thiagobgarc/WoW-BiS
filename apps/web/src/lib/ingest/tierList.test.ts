import { describe, expect, it } from 'vitest';
import type { SpecProfile } from './specCatalogue';
import {
  assignTiers,
  combineRaidScores,
  equalShareRank,
  estimateParses,
  findLastPage,
  parsesPerCharacter,
  percentileRank,
  type PageProbe,
} from './tierList';

describe('percentileRank', () => {
  it('is the rank 5% of the way down a descending list', () => {
    expect(percentileRank(1000)).toBe(50);
    expect(percentileRank(226_312)).toBe(11_316);
  });

  it('is never below rank 1, even for a tiny sample', () => {
    expect(percentileRank(1)).toBe(1);
    expect(percentileRank(10)).toBe(1);
  });
});

describe('findLastPage', () => {
  /** A ranking with `pages` full-ish pages, counting how often it is asked. */
  function ranking(pages: number) {
    const calls: number[] = [];
    const probe = async (page: number): Promise<PageProbe> => {
      calls.push(page);
      if (page > pages) return { rows: 0, hasMore: false };
      return { rows: page === pages ? 37 : 100, hasMore: page < pages };
    };
    return { probe, calls };
  }

  it.each([1, 2, 3, 17, 64, 65, 300])('finds the last of %i pages from a cold start', async (pages) => {
    const { probe } = ranking(pages);
    expect(await findLastPage(probe)).toBe(pages);
  });

  it('returns 0 when there is nothing to rank', async () => {
    const { probe } = ranking(0);
    expect(await findLastPage(probe)).toBe(0);
  });

  it("costs one request when last week's hint is still right", async () => {
    const { probe, calls } = ranking(40);
    expect(await findLastPage(probe, 40)).toBe(40);
    expect(calls).toEqual([40]);
  });

  it('recovers cheaply when the hint is a little low or overshoots', async () => {
    const grew = ranking(43);
    expect(await findLastPage(grew.probe, 40)).toBe(43);
    expect(grew.calls.length).toBeLessThanOrEqual(4);

    const shrank = ranking(12);
    expect(await findLastPage(shrank.probe, 40)).toBe(12);
  });
});

describe('assignTiers', () => {
  const s = (spec: string, role: 'dps' | 'tank' | 'healer', score: number) => ({ class: 'X', spec, role, score });

  it("tiers each spec by its share of the best score in its own role", () => {
    const entries = assignTiers([
      s('A', 'dps', 100),
      s('B', 'dps', 97),
      s('C', 'dps', 94),
      s('D', 'dps', 89),
      s('E', 'dps', 80),
      // A healer is only compared with healers.
      s('H', 'healer', 50),
    ]);
    expect(Object.fromEntries(entries.map((e) => [e.spec, e.tier]))).toEqual({
      A: 'S',
      B: 'S',
      C: 'A',
      D: 'B',
      E: 'C',
      H: 'S',
    });
  });

  it('orders by score and rounds it for the file', () => {
    const entries = assignTiers([s('Low', 'dps', 90.123), s('High', 'dps', 100.456)]);
    expect(entries.map((e) => [e.spec, e.score])).toEqual([
      ['High', 100.5],
      ['Low', 90.1],
    ]);
  });
});

describe('combineRaidScores', () => {
  const spec = (name: string, role: SpecProfile['role'] = 'dps') => ({ class: 'X', spec: name, role }) as SpecProfile;

  it('averages each spec’s share of the best in its role on each boss', () => {
    const fire = spec('Fire');
    const frost = spec('Frost');
    const resto = spec('Resto', 'healer');
    const scored = combineRaidScores([
      // Boss 1 is an AoE fight with far higher numbers; shares keep it from dominating.
      { spec: fire, encounterId: 1, amount: 2_000_000 },
      { spec: frost, encounterId: 1, amount: 1_000_000 },
      { spec: fire, encounterId: 2, amount: 400_000 },
      { spec: frost, encounterId: 2, amount: 500_000 },
      { spec: resto, encounterId: 1, amount: 300_000 },
    ]);
    const bySpec = Object.fromEntries(scored.map((r) => [r.spec, Math.round(r.score)]));
    expect(bySpec).toEqual({ Fire: 90, Frost: 75, Resto: 100 });
  });
});

describe('parsesPerCharacter', () => {
  it('takes the median ratio, so one outlier spec does not set it', () => {
    expect(
      parsesPerCharacter([
        { parses: 100, characters: 10_000 },
        { parses: 200, characters: 10_000 },
        { parses: 9_000, characters: 10_000 }, // raids far more than it runs keys
      ]),
    ).toBe(0.02);
  });

  it('is null with nothing countable', () => {
    expect(parsesPerCharacter([])).toBeNull();
    expect(parsesPerCharacter([{ parses: 0, characters: 500 }])).toBeNull();
  });
});

describe('estimateParses', () => {
  it("scales a spec's population by the boss's ratio", () => {
    expect(estimateParses(226_000, 0.02)).toBe(4_520);
  });

  it('never estimates below the cap the spec is known to exceed', () => {
    expect(estimateParses(10_000, 0.02)).toBe(2_001);
    expect(estimateParses(226_000, null)).toBe(2_001);
  });
});

describe('equalShareRank', () => {
  it('reads the most-played spec at the deepest rank the API serves', () => {
    expect(equalShareRank(240_000, 240_000)).toBe(2_000);
  });

  it('scales every other spec to the same share of its own population', () => {
    expect(equalShareRank(60_000, 240_000)).toBe(500);
    expect(equalShareRank(100, 240_000)).toBe(1);
  });
});
