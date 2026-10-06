/**
 * Spec tier lists computed from real player data, the way Archon builds
 * theirs, instead of copied by hand from a guide site.
 *
 *   - Mythic+: each spec's 95th-percentile Mythic+ score. Archon states its
 *     M+ list uses "the in-game Mythic+ Score ... the 95th percentile value
 *     for that spec". Raider.IO ranks every scored character per spec and
 *     reports how many pages of 100 there are, so the 95th percentile is
 *     the score at rank ceil(5% of the total).
 *   - Raid: each spec's 95th-percentile DPS (HPS for healers) on Mythic
 *     bosses from Warcraft Logs, the throughput figure Archon uses. WCL's
 *     rankings never report a total, only `hasMorePages`, and its API stops
 *     at 2,000 parses, which every popular spec passes on every boss. So a
 *     spec under the cap is counted exactly (see `findLastPage`), and one
 *     over it has its total estimated from its Raider.IO population, scaled
 *     by the parses-per-character the counted specs show on that boss (see
 *     `parsesPerCharacter`). Past 2,000 parses the 95th percentile sits deep
 *     in the list, where throughput changes slowly with rank, so the
 *     estimate moves a spec's number only slightly. Archon reads WCL's full
 *     data directly and needs no estimate; this is the nearest the public
 *     API allows. A spec's raid score is the mean of its per-boss 95th
 *     percentiles, each relative to the best spec in its role on that boss,
 *     so a boss with more targets doesn't outweigh the rest.
 *
 * Both lists rank specs against their own role only: a healer's score
 * means nothing next to a DPS's.
 */
import type { MetaRole, MetaTier, MetaTierEntry } from '@mythos/core/meta';
import type { SpecProfile } from './specCatalogue';
import { fetchJson, urlSlug, warcraftLogsQuery, wclSlug } from './topPlayers';

export const PERCENTILE = 0.95;
const PAGE_SIZE = 100;

/** 1-based rank of the given percentile among `total` descending entries. */
export function percentileRank(total: number, percentile = PERCENTILE): number {
  // Rounded before the ceiling: (1 - 0.95) * 1000 is 50.000000000000004 in
  // floating point, which would put the 95th percentile at rank 51.
  return Math.max(1, Math.ceil(Number(((1 - percentile) * total).toFixed(6))));
}

export interface PageProbe {
  rows: number;
  hasMore: boolean;
}

/**
 * The last non-empty page of a paginated ranking that only says whether
 * another page exists. Gallops out from `hint` (last week's answer, so a
 * repeat run costs two or three requests), then binary-searches. Pages are
 * 1-based; returns 0 when even page 1 is empty.
 */
export async function findLastPage(probe: (page: number) => Promise<PageProbe>, hint = 1): Promise<number> {
  let page = Math.max(1, hint);
  let lo = 0; // highest page known to have more after it
  let hi = Infinity; // lowest page known to be empty

  for (let step = 1; ; step *= 2) {
    const { rows, hasMore } = await probe(page);
    if (rows > 0 && !hasMore) return page;
    if (rows === 0) {
      hi = page;
      if (page === 1) return 0;
      break;
    }
    lo = page;
    page += step;
  }
  if (lo === 0) {
    // The hint overshot: walk down until a page has rows.
    for (let step = 1; ; step *= 2) {
      page = Math.max(1, hi - step);
      const { rows, hasMore } = await probe(page);
      if (rows > 0 && !hasMore) return page;
      if (rows > 0) {
        lo = page;
        break;
      }
      hi = page;
      if (page === 1) return 0;
    }
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const { rows, hasMore } = await probe(mid);
    if (rows > 0 && !hasMore) return mid;
    if (rows > 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

export interface ScoredSpec {
  class: string;
  spec: string;
  role: MetaRole;
  score: number;
}

/**
 * S/A/B/C by distance from the best spec in the role, as a share of its
 * score. Thresholds rather than fixed-size buckets: when four DPS specs sit
 * within 1% of each other they are all S, and a role with one clear outlier
 * says so, which a "top 25%" rule would hide.
 */
export const TIER_THRESHOLDS: { tier: MetaTier; atLeast: number }[] = [
  { tier: 'S', atLeast: 0.97 },
  { tier: 'A', atLeast: 0.93 },
  { tier: 'B', atLeast: 0.88 },
];

export function assignTiers(specs: ScoredSpec[]): MetaTierEntry[] {
  const best = new Map<MetaRole, number>();
  for (const s of specs) best.set(s.role, Math.max(best.get(s.role) ?? 0, s.score));
  return [...specs]
    .sort((a, b) => b.score - a.score)
    .map((s) => {
      const share = s.score / (best.get(s.role) || 1);
      const tier = TIER_THRESHOLDS.find((t) => share >= t.atLeast)?.tier ?? 'C';
      return { class: s.class, spec: s.spec, role: s.role, tier, score: Math.round(s.score * 10) / 10 };
    });
}

// --- Mythic+ (Raider.IO) -------------------------------------------------

async function rioPage(spec: SpecProfile, season: string, page: number): Promise<any> {
  const data = await fetchJson(
    `https://raider.io/api/mythic-plus/rankings/specs?region=world&season=${season}` +
      `&class=${urlSlug(spec.class)}&spec=${urlSlug(spec.spec)}&page=${page}`,
  );
  if (!data?.rankings) throw new Error(`Raider.IO returned no rankings for ${spec.spec} ${spec.class} page ${page}`);
  return data.rankings;
}

/** The spec's 95th-percentile M+ score and how many scored characters it has. */
export async function mythicPlusPercentile(spec: SpecProfile, season: string): Promise<{ score: number; total: number }> {
  const first = await rioPage(spec, season, 0);
  const lastPage: number = first.ui?.lastPage ?? 0;
  const last = lastPage === 0 ? first : await rioPage(spec, season, lastPage);
  const total = lastPage * PAGE_SIZE + (last.rankedCharacters?.length ?? 0);
  if (total === 0) throw new Error(`No ranked ${spec.spec} ${spec.class} characters on Raider.IO`);

  const rank = percentileRank(total);
  const page = Math.floor((rank - 1) / PAGE_SIZE);
  const rows = page === 0 ? first : page === lastPage ? last : await rioPage(spec, season, page);
  const row = rows.rankedCharacters?.[(rank - 1) % PAGE_SIZE];
  if (typeof row?.score !== 'number') throw new Error(`No score at rank ${rank} for ${spec.spec} ${spec.class}`);
  return { score: row.score, total };
}

// --- Raid (Warcraft Logs) ------------------------------------------------

/** WCL's difficulty ids: 5 is Mythic. */
const MYTHIC = 5;

export interface WclBudget {
  spent: number;
  limit: number;
  resetInSeconds: number;
}

export async function warcraftLogsBudget(): Promise<WclBudget> {
  const data = await warcraftLogsQuery('{ rateLimitData { pointsSpentThisHour limitPerHour pointsResetIn } }');
  const r = data.rateLimitData;
  return { spent: r.pointsSpentThisHour, limit: r.limitPerHour, resetInSeconds: r.pointsResetIn };
}

/**
 * Rankings pages for one spec on one boss, memoised, so finding the total
 * and then reading the percentile row never fetch the same page twice.
 * The guard runs ahead of every real request to wait out the hourly point
 * budget, and once more after a refused one, which is then retried once.
 */
export interface WclGuard {
  beforeQuery: () => Promise<void>;
  afterFailure: () => Promise<void>;
}

function raidPages(spec: SpecProfile, encounterId: number, guard: WclGuard) {
  const metric = spec.role === 'healer' ? 'hps' : 'dps';
  const cache = new Map<number, { amounts: number[]; hasMore: boolean }>();
  const query =
    `{ worldData { encounter(id: ${encounterId}) { characterRankings(className: ${JSON.stringify(wclSlug(spec.class))}, ` +
    `specName: ${JSON.stringify(wclSlug(spec.spec))}, difficulty: ${MYTHIC}, metric: ${metric}, page: PAGE) } } }`;
  return async (page: number) => {
    const hit = cache.get(page);
    if (hit) return hit;
    await guard.beforeQuery();
    const data = await warcraftLogsQuery(query.replace('PAGE', String(page))).catch(async () => {
      // Usually the hourly budget, spent by something else sharing the key.
      await guard.afterFailure();
      return warcraftLogsQuery(query.replace('PAGE', String(page)));
    });
    const rankings = data?.worldData?.encounter?.characterRankings;
    // A wrong class or spec name returns an empty object, not an error.
    if (!rankings || rankings.count === undefined) {
      throw new Error(`Warcraft Logs returned no rankings object for ${spec.spec} ${spec.class} on encounter ${encounterId}`);
    }
    const result = {
      amounts: (rankings.rankings ?? []).map((r: { amount: number }) => r.amount),
      hasMore: Boolean(rankings.hasMorePages),
    };
    cache.set(page, result);
    return result;
  };
}

/**
 * WCL's API serves at most 20 pages of rankings (2,000 parses) per query,
 * and popular specs have far more Mythic parses than that on every boss,
 * so their totals cannot be counted. Splitting by region doesn't help: US
 * alone passed 2,000 Arcane Mage parses on the first boss.
 */
export const WCL_MAX_PAGE = 20;

export type RaidCount = { kind: 'counted'; total: number } | { kind: 'over-cap' } | { kind: 'none' };

export interface RaidSpecPages {
  /** How many parses the spec has on the boss, or that it is past the cap. */
  count: (hintParses?: number) => Promise<RaidCount>;
  /** Throughput of the parse at a 1-based rank (capped at the API's 2,000). */
  amountAt: (rank: number) => Promise<number | undefined>;
}

export function raidSpecPages(spec: SpecProfile, encounterId: number, guard: WclGuard): RaidSpecPages {
  const pages = raidPages(spec, encounterId, guard);
  return {
    async count(hintParses) {
      // One request settles the common case: a full last page means the
      // spec is past the cap, and there is nothing more to count.
      const last = await pages(WCL_MAX_PAGE);
      if (last.amounts.length === PAGE_SIZE) return { kind: 'over-cap' };
      const hint = Math.min(WCL_MAX_PAGE, hintParses ? Math.ceil(hintParses / PAGE_SIZE) : 1);
      const lastPage =
        last.amounts.length > 0
          ? WCL_MAX_PAGE
          : await findLastPage(async (p) => {
              if (p >= WCL_MAX_PAGE) return { rows: 0, hasMore: false };
              const { amounts, hasMore } = await pages(p);
              return { rows: amounts.length, hasMore };
            }, hint);
      if (lastPage === 0) return { kind: 'none' };
      return { kind: 'counted', total: (lastPage - 1) * PAGE_SIZE + (await pages(lastPage)).amounts.length };
    },
    async amountAt(rank) {
      const capped = Math.min(rank, WCL_MAX_PAGE * PAGE_SIZE);
      return (await pages(Math.ceil(capped / PAGE_SIZE))).amounts[(capped - 1) % PAGE_SIZE];
    },
  };
}

/**
 * Raid parses per Raider.IO-ranked character on one boss, from the specs
 * small enough to count exactly: the median ratio, so one spec that raids
 * far more (or less) than it runs keys doesn't set it for everyone. Used to
 * estimate the totals of the specs past the API's cap. Null when no spec
 * could be counted, in which case those specs fall back to the cap itself.
 */
export function parsesPerCharacter(counted: { parses: number; characters: number }[]): number | null {
  const ratios = counted.filter((c) => c.characters > 0 && c.parses > 0).map((c) => c.parses / c.characters);
  if (ratios.length === 0) return null;
  ratios.sort((a, b) => a - b);
  const mid = Math.floor(ratios.length / 2);
  return ratios.length % 2 ? ratios[mid]! : (ratios[mid - 1]! + ratios[mid]!) / 2;
}

/**
 * The estimated parse total for a spec past the cap: its Raider.IO
 * population times the boss's parses-per-character, never below the cap it
 * is known to exceed.
 */
export function estimateParses(characters: number, ratio: number | null): number {
  const floor = WCL_MAX_PAGE * PAGE_SIZE + 1;
  return ratio === null ? floor : Math.max(floor, Math.round(characters * ratio));
}

/**
 * Per-boss 95th percentiles, made comparable across bosses: each becomes a
 * share of the best spec in the same role on that boss, then a spec's score
 * is the mean share across bosses, scaled to 100. A boss a spec has no
 * parses on is left out of that spec's mean rather than counted as zero.
 */
export function combineRaidScores(
  perBoss: { spec: SpecProfile; encounterId: number; amount: number }[],
): ScoredSpec[] {
  const best = new Map<string, number>();
  for (const r of perBoss) {
    const key = `${r.encounterId}/${r.spec.role}`;
    best.set(key, Math.max(best.get(key) ?? 0, r.amount));
  }
  const shares = new Map<string, { spec: SpecProfile; total: number; n: number }>();
  for (const r of perBoss) {
    const key = `${r.spec.class}/${r.spec.spec}`;
    const entry = shares.get(key) ?? { spec: r.spec, total: 0, n: 0 };
    entry.total += r.amount / (best.get(`${r.encounterId}/${r.spec.role}`) || 1);
    entry.n += 1;
    shares.set(key, entry);
  }
  return [...shares.values()].map(({ spec, total, n }) => ({
    class: spec.class,
    spec: spec.spec,
    role: spec.role as MetaRole,
    score: (total / n) * 100,
  }));
}
