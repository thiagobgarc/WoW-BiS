/**
 * Seeds recommended talent builds (data/talents/<season>/) by decoding the
 * in-game export strings Icy Veins publishes for each spec, rather than
 * transcribing builds by hand. Run with `bun run talents:import`.
 *
 * Inputs, all fetched live:
 *   - Icy Veins' "<spec>-<class>-pve-<role>-spec-builds-talents" page per
 *     spec: labeled export strings ("Raid / Cleave – Fel-Scarred", ...).
 *   - Raidbots' talents.json: each spec's full serialization node order and
 *     which nodes are class / spec / hero, which no Blizzard endpoint has.
 *   - Blizzard's talent tree (the one the site renders): every node and
 *     choice index must exist there, or the build would render wrong.
 *
 * A build is written only if it decodes to the expected spec with clean
 * padding and every pick validates. Existing files are left alone unless
 * --force is passed, so hand-curated builds aren't overwritten.
 *
 * Hero talents are decoded but not written — the seed schema doesn't model
 * them yet (see packages/core/src/talents/types.ts).
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getTalentTree } from '@/lib/blizzard/client';
import { SPEC_CATALOGUE, specSlug, type SpecProfile } from '@/lib/ingest/specCatalogue';
import { SPEC_IDS, specKey } from '@/lib/meta/specIds';
import { CURRENT_SEASON_ID } from '@/lib/season/seasonConfig';
import { decodeLoadout } from '@/lib/talents/exportString';
import { RecommendedTalentBuildSchema, type RecommendedContentType, type RecommendedSelection } from '@mythos/core/talents';

const FORCE = process.argv.includes('--force');
const OUT_DIR = path.join(process.cwd(), 'data', 'talents', CURRENT_SEASON_ID);
const RAIDBOTS_URL = 'https://www.raidbots.com/static/data/live/talents.json';
const USER_AGENT = 'Mozilla/5.0 (compatible; MythosDataImport/1.0)';
const TODAY = new Date().toISOString().slice(0, 10);

interface RaidbotsNode {
  id: number;
  maxRanks: number;
  entries: unknown[];
}
interface RaidbotsSpec {
  specId: number;
  fullNodeOrder: number[];
  classNodes: RaidbotsNode[];
  specNodes: RaidbotsNode[];
}

// Icy Veins labels builds per page, not to a fixed vocabulary. Candidates are
// ordered by rule, then page order, so a spec's headline build beats later
// situational ones; a candidate that fails validation falls through to the
// next. Defensive variants are a last resort, and "No 4pc" variants are
// skipped outright since they assume you lack the tier set.
const SKIP = /no 4pc/i;
const LAST_RESORT = /defensive/i;
const RULES: Record<RecommendedContentType, RegExp[]> = {
  raid: [/\braid(ing|s)?\b/i, /single[- ]target/i],
  'mythic-plus': [/mythic\+|\bM\+|dungeon/i, /\baoe\b|multi[- ]target/i],
};

function icyVeinsUrl(spec: SpecProfile): string {
  const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');
  const role = { dps: 'dps', healer: 'healing', tank: 'tank' }[spec.role];
  return `https://www.icy-veins.com/wow/${slug(spec.spec)}-${slug(spec.class)}-pve-${role}-spec-builds-talents`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&ndash;|&mdash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBuilds(html: string): { label: string; code: string }[] {
  const pairs = html.matchAll(/export-string__title">([\s\S]*?)<\/span>[\s\S]*?export-string__code">\s*([A-Za-z0-9+/]+)\s*</g);
  return [...pairs].map((m) => ({ label: decodeEntities(m[1]!), code: m[2]! }));
}

function candidatesFor(builds: { label: string; code: string }[], contentType: RecommendedContentType) {
  const usable = builds.filter((b) => !SKIP.test(b.label));
  const ordered = [...new Set(RULES[contentType].flatMap((rule) => usable.filter((b) => rule.test(b.label))))];
  return [...ordered.filter((b) => !LAST_RESORT.test(b.label)), ...ordered.filter((b) => LAST_RESORT.test(b.label))];
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return res.text();
}

function toSeed(
  spec: SpecProfile,
  contentType: RecommendedContentType,
  build: { label: string; code: string },
  rb: RaidbotsSpec,
  blizzardOptions: Map<number, number>,
  sourceUrl: string,
) {
  const specId = SPEC_IDS[specKey(spec.class, spec.spec)]!;
  const decoded = decodeLoadout(build.code, rb.fullNodeOrder);
  if (decoded.specId !== specId) throw new Error(`string is for spec ${decoded.specId}, expected ${specId}`);
  if (!decoded.paddingClean) throw new Error(`misaligned decode (${decoded.leftoverBits} leftover bits)`);

  const classNodes = new Map(rb.classNodes.map((n) => [n.id, n]));
  const specNodes = new Map(rb.specNodes.map((n) => [n.id, n]));
  const classSelections: RecommendedSelection[] = [];
  const specSelections: RecommendedSelection[] = [];

  for (const pick of decoded.picks) {
    const node = classNodes.get(pick.nodeId) ?? specNodes.get(pick.nodeId);
    if (!node) continue; // hero or sub-tree selection node — not modeled in the seed schema
    const optionCount = blizzardOptions.get(pick.nodeId);
    if (optionCount === undefined) throw new Error(`node ${pick.nodeId} is not in Blizzard's tree for this spec`);
    const optionIndex = pick.choiceIndex ?? 0;
    // A choice bit on a node that isn't a choice (or an index past its
    // options) means the string was made against a different tree version.
    if (pick.choiceIndex !== null && (optionCount < 2 || optionIndex >= optionCount)) {
      throw new Error(`node ${pick.nodeId} picks option ${optionIndex} of ${optionCount} — string predates the current tree`);
    }
    const selection = { nodeId: pick.nodeId, rank: pick.partialRank ?? node.maxRanks, optionIndex };
    (classNodes.has(pick.nodeId) ? classSelections : specSelections).push(selection);
  }

  return RecommendedTalentBuildSchema.parse({
    season: CURRENT_SEASON_ID,
    class: spec.class,
    spec: spec.spec,
    contentType,
    classSelections,
    specSelections,
    notes: `Decoded from Icy Veins' "${build.label}" in-game export string (${sourceUrl}), imported ${TODAY} by scripts/import-talents.ts. Export string: ${build.code}`,
  });
}

async function main(): Promise<void> {
  console.log(`Importing talent builds for ${CURRENT_SEASON_ID}${FORCE ? ' (--force: overwriting existing files)' : ''}`);
  const raidbots = JSON.parse(await fetchText(RAIDBOTS_URL)) as RaidbotsSpec[];
  await mkdir(OUT_DIR, { recursive: true });

  let written = 0;
  const problems: string[] = [];
  for (const spec of SPEC_CATALOGUE) {
    const slug = specSlug(spec.class, spec.spec);
    const targets = (['mythic-plus', 'raid'] as const).filter((ct) => {
      const file = path.join(OUT_DIR, ct === 'raid' ? `${slug}-raid.json` : `${slug}.json`);
      return FORCE || !existsSync(file);
    });
    if (targets.length === 0) continue;

    const specId = SPEC_IDS[specKey(spec.class, spec.spec)]!;
    const rb = raidbots.find((s) => s.specId === specId);
    if (!rb) {
      problems.push(`${slug}: not in Raidbots data`);
      continue;
    }
    const tree = await getTalentTree('us', specId);
    if (tree.mock) throw new Error('Blizzard credentials are not set — refusing to validate against mock data');
    const blizzardOptions = new Map(
      [...tree.data.class_talent_nodes, ...tree.data.spec_talent_nodes].map((n) => {
        const last = n.ranks[n.ranks.length - 1];
        return [n.id, last?.choice_of_tooltips?.length ?? (last?.tooltip ? 1 : 0)] as const;
      }),
    );

    const url = icyVeinsUrl(spec);
    const builds = extractBuilds(await fetchText(url));
    await new Promise((r) => setTimeout(r, 1000)); // one page a second

    for (const contentType of targets) {
      const candidates = candidatesFor(builds, contentType);
      if (candidates.length === 0) {
        problems.push(`${slug} ${contentType}: no matching build among [${builds.map((b) => b.label).join(' | ')}]`);
        continue;
      }
      const rejected: string[] = [];
      let accepted: { seed: ReturnType<typeof toSeed>; label: string } | null = null;
      for (const candidate of candidates) {
        try {
          accepted = { seed: toSeed(spec, contentType, candidate, rb, blizzardOptions, url), label: candidate.label };
          break;
        } catch (err) {
          rejected.push(`"${candidate.label}": ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (!accepted) {
        problems.push(`${slug} ${contentType}: every candidate failed — ${rejected.join('; ')}`);
        continue;
      }
      const { seed, label } = accepted;
      const file = path.join(OUT_DIR, contentType === 'raid' ? `${slug}-raid.json` : `${slug}.json`);
      await writeFile(file, JSON.stringify(seed, null, 2) + '\n');
      const points = (xs: RecommendedSelection[]) => xs.reduce((t, x) => t + x.rank, 0);
      console.log(
        `  ${slug.padEnd(28)} ${contentType.padEnd(11)} class ${points(seed.classSelections)} / spec ${points(seed.specSelections)}  "${label}"`,
      );
      if (rejected.length > 0) console.log(`    fell back past ${rejected.join('; ')}`);
      written++;
    }
  }

  console.log(`\nWrote ${written} build file(s).`);
  if (problems.length > 0) {
    console.log(`${problems.length} not written:`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exitCode = 1;
  }
}

await main();
