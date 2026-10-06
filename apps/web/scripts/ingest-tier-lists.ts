/**
 * Rebuilds the Mythic+ and raid tier lists from real player data and writes
 * them to /data/meta/{season}, replacing the hand-copied guide-site lists.
 * See src/lib/ingest/tierList.ts for the method (each spec's 95th
 * percentile, as Archon measures it) and why it is computed this way.
 *
 * Run with `bun run tiers:ingest` (needs WCL_CLIENT_ID/SECRET for the raid
 * list; the Mythic+ list uses Raider.IO's public rankings).
 *
 * Warcraft Logs allows 720 points an hour and a rankings page costs about 1.
 * Finding each spec's parse total takes several pages on a cold start, so
 * the totals are saved beside the lists and used as next week's starting
 * point, which brings a repeat run down to two or three pages per spec per
 * boss. When the hour's budget runs low the script waits for it to reset
 * rather than failing halfway.
 *
 * Flags:
 *   --dry-run          compute and print, write nothing
 *   --only=mplus|raid  just one of the two lists
 *   --spec=a,b         only these spec slugs; prints, writes nothing
 *   --season=...       defaults to CURRENT_SEASON_ID
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MetaTierListSchema, type MetaContentType, type MetaTierList } from '@mythos/core/meta';
import { SPEC_CATALOGUE, specSlug, type SpecProfile } from '../src/lib/ingest/specCatalogue';
import { hasWarcraftLogsCredentials } from '../src/lib/ingest/topPlayers';
import {
  PERCENTILE,
  assignTiers,
  combineRaidScores,
  estimateParses,
  mythicPlusPercentile,
  parsesPerCharacter,
  percentileRank,
  raidSpecPages,
  warcraftLogsBudget,
  type ScoredSpec,
} from '../src/lib/ingest/tierList';
import { CURRENT_SEASON_ID, seasonConfig } from '../src/lib/season/seasonConfig';

function flag(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const SEASON = flag('season', CURRENT_SEASON_ID);
const ONLY = flag('only', '');
const ONLY_SPECS = flag('spec', '').split(',').filter(Boolean);
const DRY_RUN = process.argv.includes('--dry-run') || ONLY_SPECS.length > 0;
const OUT_DIR = path.join(process.cwd(), 'data', 'meta', SEASON);
const COUNTS_FILE = path.join(OUT_DIR, 'raid-parse-counts.json');
const TODAY = new Date().toISOString().slice(0, 10);
const PCT = Math.round(PERCENTILE * 100);

const specs = ONLY_SPECS.length > 0
  ? SPEC_CATALOGUE.filter((s) => ONLY_SPECS.includes(specSlug(s.class, s.spec)))
  : SPEC_CATALOGUE;

const label = (s: SpecProfile) => `${s.spec} ${s.class}`.padEnd(26);

async function write(list: MetaTierList): Promise<void> {
  const parsed = MetaTierListSchema.parse(list);
  const file = path.join(OUT_DIR, `${parsed.contentType}-tier-list.json`);
  if (DRY_RUN) return;
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

function print(contentType: MetaContentType, scored: ScoredSpec[]): void {
  console.log(`\n${contentType} (${PCT}th percentile)`);
  for (const e of assignTiers(scored)) console.log(`  ${e.tier}  ${e.role.padEnd(6)} ${e.spec} ${e.class}`.padEnd(42) + e.score);
}

/**
 * The Mythic+ list, and each spec's Raider.IO population, which the raid
 * list needs to estimate the parse totals the WCL API won't count.
 */
async function mythicPlus(): Promise<Map<SpecProfile, number>> {
  console.log(`Mythic+: Raider.IO rankings, ${seasonConfig.raiderIoSeason}`);
  const scored: ScoredSpec[] = [];
  const characters = new Map<SpecProfile, number>();
  for (const spec of specs) {
    const { score, total } = await mythicPlusPercentile(spec, seasonConfig.raiderIoSeason);
    console.log(`  ${label(spec)} ${String(score).padStart(8)}  of ${total} characters`);
    scored.push({ class: spec.class, spec: spec.spec, role: spec.role, score });
    characters.set(spec, total);
  }
  if (ONLY === 'raid') return characters;
  print('mythic-plus', scored);
  await write({
    season: SEASON,
    contentType: 'mythic-plus',
    lastUpdated: TODAY,
    source: `Raider.IO Mythic+ rankings: each spec's ${PCT}th-percentile Mythic+ score across every ranked character`,
    sourceUrls: ['https://raider.io/mythic-plus-spec-rankings'],
    notes:
      `Measured the way Archon ranks Mythic+ specs: the Mythic+ score of the character at the ${PCT}th percentile of ` +
      'each spec, so a few record holders do not carry a spec. Tiers are each spec’s share of the best score in its ' +
      'role: S within 3%, A within 7%, B within 12%. Rebuilt weekly.',
    entries: assignTiers(scored),
  });
  return characters;
}

async function readCounts(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await readFile(COUNTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/** Points held back so other jobs sharing the key (the BiS run) keep some. */
const BUDGET_MARGIN = 10;

/**
 * Waits out the hourly point budget instead of failing mid-run. After each
 * check it spends only the points it knows are left (a rankings page costs
 * about one), then checks again. A fixed "every 25 requests" check let the
 * first full run overshoot the limit between checks and die on a refused
 * request.
 */
function budgetGuard() {
  let allowance = 0;
  const waitForReset = async () => {
    // Once the hour is spent, WCL refuses every query, including the one
    // that reports when the hour resets. So a failed check means locked
    // out: wait a minute and ask again until it answers.
    let b = await warcraftLogsBudget().catch(() => null);
    while (!b) {
      console.log('  … Warcraft Logs is refusing requests (hourly budget spent), checking again in 60s');
      await new Promise((r) => setTimeout(r, 60_000));
      b = await warcraftLogsBudget().catch(() => null);
    }
    allowance = Math.floor(b.limit - b.spent - BUDGET_MARGIN);
    if (allowance <= 0) {
      console.log(`  … Warcraft Logs budget at ${Math.round(b.spent)}/${b.limit}, waiting ${b.resetInSeconds}s for the reset`);
      await new Promise((r) => setTimeout(r, (b.resetInSeconds + 5) * 1000));
      allowance = Math.floor(b.limit - BUDGET_MARGIN);
    }
  };
  return {
    async beforeQuery() {
      if (allowance <= 0) await waitForReset();
      allowance -= 1;
    },
    /** After a refused request: re-read the budget, waiting if it is spent. */
    async afterFailure() {
      allowance = 0;
      await waitForReset();
    },
  };
}

async function raid(characters: Map<SpecProfile, number>): Promise<void> {
  if (!hasWarcraftLogsCredentials()) throw new Error('WCL_CLIENT_ID / WCL_CLIENT_SECRET are not set');
  const encounters = seasonConfig.raid.warcraftLogsTierEncounterIds;
  console.log(`\nRaid: Warcraft Logs Mythic, encounters ${encounters.join(', ')}`);
  const counts = await readCounts();
  const guard = budgetGuard();
  const perBoss: { spec: SpecProfile; encounterId: number; amount: number }[] = [];

  for (const encounterId of encounters) {
    // Pass 1: count every spec, so the ones under the API's cap can scale
    // an estimate for the ones over it.
    const rows = [];
    for (const spec of specs) {
      const key = `${encounterId}/${specSlug(spec.class, spec.spec)}`;
      const pages = raidSpecPages(spec, encounterId, guard);
      rows.push({ spec, key, pages, count: await pages.count(counts[key]) });
    }
    const ratio = parsesPerCharacter(
      rows.flatMap((r) =>
        r.count.kind === 'counted' ? [{ parses: r.count.total, characters: characters.get(r.spec) ?? 0 }] : [],
      ),
    );
    console.log(`  encounter ${encounterId}: ${ratio === null ? 'no countable spec' : `${ratio.toFixed(4)} parses per M+ character`}`);

    // Pass 2: the parse at each spec's 95th-percentile rank.
    for (const { spec, key, pages, count } of rows) {
      if (count.kind === 'none') {
        console.log(`    ${label(spec)} no parses`);
        continue;
      }
      if (count.kind === 'counted') counts[key] = count.total;
      const total = count.kind === 'counted' ? count.total : estimateParses(characters.get(spec) ?? 0, ratio);
      const amount = await pages.amountAt(percentileRank(total));
      if (amount === undefined) continue;
      perBoss.push({ spec, encounterId, amount });
      console.log(
        `    ${label(spec)} ${String(Math.round(amount)).padStart(9)}  at rank ${percentileRank(total)} of ` +
          `${count.kind === 'counted' ? total : `~${total} (estimated)`}`,
      );
    }
    // Saved per boss, so a run that dies partway still leaves the next one
    // the counts it paid for.
    if (!DRY_RUN) {
      await mkdir(OUT_DIR, { recursive: true });
      await writeFile(COUNTS_FILE, `${JSON.stringify(counts, null, 2)}\n`);
    }
  }

  const scored = combineRaidScores(perBoss);
  print('raid', scored);
  await write({
    season: SEASON,
    contentType: 'raid',
    lastUpdated: TODAY,
    source: `Warcraft Logs Mythic ${seasonConfig.raid.name} rankings: each spec's ${PCT}th-percentile DPS (HPS for healers)`,
    sourceUrls: ['https://www.warcraftlogs.com/zone/rankings/53'],
    notes:
      `Measured the way Archon ranks raid specs: throughput at the ${PCT}th percentile of each spec's Mythic parses, ` +
      `on the first ${encounters.length} bosses so every spec is compared on the same fights. Each boss counts equally ` +
      '(a spec’s number there is taken as a share of the best spec in its role), so a fight with more targets does not ' +
      'outweigh the rest. Warcraft Logs’ public API lists at most 2,000 parses per spec and boss, so for specs past ' +
      'that the parse count behind the percentile is estimated from their player population; Archon reads the full ' +
      'data and needs no estimate. Tanks are ranked by damage. Tiers: S within 3% of the best in the role, A within 7%, ' +
      'B within 12%. Rebuilt weekly.',
    entries: assignTiers(scored),
  });
  if (!DRY_RUN) await writeFile(COUNTS_FILE, `${JSON.stringify(counts, null, 2)}\n`);
}

// The Mythic+ pass always runs: the raid list needs its populations.
const characters = await mythicPlus();
if (ONLY !== 'mplus') await raid(characters);
