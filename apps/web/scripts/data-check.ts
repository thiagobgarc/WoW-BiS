/**
 * Validates and reports on every curated dataset under /data.
 *
 * Three datasets, two provenances. BiS lists are derived from Blizzard's own
 * loot tables by `bun run bis:ingest`, so they are checked for schema and
 * coverage. Meta tier lists and recommended talent builds cannot be derived
 * from any Blizzard endpoint — there is no "current meta" or "recommended
 * build" API, because both are sim output — so for those this is the whole
 * pipeline: validate the shape, surface the gaps, and flag the age, so that
 * stale theorycraft is visible rather than quietly served as current.
 *
 * Run with `bun run data:check`. Exits non-zero on a schema failure, which
 * makes it usable as a CI gate.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { BisListSchema } from '@mythos/core/bis';
import { MetaTierListSchema } from '@mythos/core/meta';
import { RecommendedTalentBuildSchema } from '@mythos/core/talents';
import { CURRENT_SEASON_ID, seasonConfig } from '../src/lib/season/seasonConfig';
import { SPEC_CATALOGUE, specSlug } from '../src/lib/ingest/specCatalogue';

/** Tier lists older than this are reported as stale. */
const STALE_AFTER_DAYS = 30;

const SEASON = process.argv.find((a) => a.startsWith('--season='))?.slice(9) ?? CURRENT_SEASON_ID;
const ROOT = process.cwd();

let failures = 0;

function fail(message: string): void {
  console.error(`  FAIL  ${message}`);
  failures++;
}

function ok(message: string): void {
  console.log(`  ok    ${message}`);
}

function note(message: string): void {
  console.log(`  note  ${message}`);
}

async function readJsonFiles(dir: string): Promise<{ name: string; data: unknown }[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: { name: string; data: unknown }[] = [];
  for (const name of names.filter((n) => n.endsWith('.json'))) {
    out.push({ name, data: JSON.parse(await readFile(path.join(dir, name), 'utf-8')) });
  }
  return out;
}

function daysSince(isoDate: string): number | null {
  const then = Date.parse(isoDate);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

async function checkBis(): Promise<void> {
  console.log(`\nBiS lists  (derived from Blizzard loot tables)`);
  const files = await readJsonFiles(path.join(ROOT, 'data', 'bis', SEASON));
  if (files.length === 0) return fail('no BiS seed files found — run: bun run bis:ingest');

  const seen = new Set<string>();
  let fabricated = 0;

  for (const file of files) {
    const parsed = BisListSchema.safeParse(file.data);
    if (!parsed.success) {
      fail(`${file.name}: ${parsed.error.issues[0]?.message ?? 'schema error'}`);
      continue;
    }
    seen.add(specSlug(parsed.data.class, parsed.data.spec));
    // The pre-pipeline lists used sequential invented ids from 340001 that
    // 404 against Blizzard. Catch any regression back to fabricated data.
    fabricated += parsed.data.entries.filter((e) => e.itemId >= 340001 && e.itemId <= 340999).length;
  }

  if (fabricated > 0) fail(`${fabricated} entries use fabricated item ids in the 340xxx range`);
  else ok(`${files.length} lists, all schema-valid, no fabricated item ids`);

  const missing = SPEC_CATALOGUE.filter((s) => !seen.has(specSlug(s.class, s.spec)));
  if (missing.length > 0) {
    note(`${missing.length} specs have no BiS list: ${missing.map((s) => `${s.class} ${s.spec}`).join(', ')}`);
  } else {
    ok(`all ${SPEC_CATALOGUE.length} specs covered`);
  }

  const unreviewed = SPEC_CATALOGUE.filter((s) => s.provenance === 'default');
  if (unreviewed.length > 0) {
    note(
      `${unreviewed.length} of ${SPEC_CATALOGUE.length} specs rank against an unreviewed stat priority ` +
        '(real items, unverified secondary ordering)',
    );
  }
}

async function checkMeta(): Promise<void> {
  console.log(`\nMeta tier lists  (curated — no Blizzard endpoint exists)`);
  const files = await readJsonFiles(path.join(ROOT, 'data', 'meta', SEASON));
  if (files.length === 0) return fail('no tier lists found');

  const catalogue = new Set(SPEC_CATALOGUE.map((s) => specSlug(s.class, s.spec)));

  for (const file of files) {
    const parsed = MetaTierListSchema.safeParse(file.data);
    if (!parsed.success) {
      fail(`${file.name}: ${parsed.error.issues[0]?.message ?? 'schema error'}`);
      continue;
    }
    const list = parsed.data;
    const age = daysSince(list.lastUpdated);

    const unknown = list.entries.filter((e) => !catalogue.has(specSlug(e.class, e.spec)));
    if (unknown.length > 0) {
      fail(`${file.name}: ${unknown.length} entries name a spec that does not exist (${unknown.slice(0, 3).map((e) => `${e.class} ${e.spec}`).join(', ')})`);
    }

    const covered = new Set(list.entries.map((e) => specSlug(e.class, e.spec)));
    const absent = [...catalogue].filter((s) => !covered.has(s));

    ok(`${file.name}: ${list.entries.length} entries, ${list.contentType}`);
    if (age !== null && age > STALE_AFTER_DAYS) {
      note(`${file.name} is ${age} days old (updated ${list.lastUpdated}) — the meta has almost certainly moved`);
    }
    if (absent.length > 0) note(`${file.name} rates ${covered.size} of ${catalogue.size} specs`);
  }
}

async function checkTalents(): Promise<void> {
  console.log(`\nRecommended talent builds  (curated — no Blizzard endpoint exists)`);
  const files = await readJsonFiles(path.join(ROOT, 'data', 'talents', SEASON));
  if (files.length === 0) return fail('no talent builds found');

  for (const file of files) {
    const parsed = RecommendedTalentBuildSchema.safeParse(file.data);
    if (!parsed.success) fail(`${file.name}: ${parsed.error.issues[0]?.message ?? 'schema error'}`);
  }

  // Each spec wants two files: a bare slug for Mythic+ and a -raid suffix.
  const names = new Set(files.map((f) => f.name.replace(/\.json$/, '')));
  const missing: string[] = [];
  for (const spec of SPEC_CATALOGUE) {
    const base = specSlug(spec.class, spec.spec);
    if (!names.has(base)) missing.push(`${base} (mythic-plus)`);
    if (!names.has(`${base}-raid`)) missing.push(`${base} (raid)`);
  }

  ok(`${files.length} build files, all schema-valid`);
  if (missing.length > 0) {
    note(`${missing.length} of ${SPEC_CATALOGUE.length * 2} spec/content combinations have no build`);
  }
}

function checkSeasonConfig(): void {
  console.log(`\nseasonConfig`);
  const classes = [...new Set(SPEC_CATALOGUE.map((s) => s.class))];
  const missing = classes.filter((c) => !seasonConfig.classTierSets[c]);
  if (missing.length > 0) {
    note(`classTierSets has no set for ${missing.join(', ')} — those specs carry no tier pieces`);
  } else {
    ok('classTierSets covers every class');
  }

  const withBonuses = Object.keys(seasonConfig.tierSets).length;
  if (withBonuses < SPEC_CATALOGUE.length) {
    note(`tier bonus text is researched for ${withBonuses} of ${SPEC_CATALOGUE.length} specs`);
  }
}

async function main(): Promise<void> {
  console.log(`Checking curated data for season "${SEASON}"`);
  await checkBis();
  await checkMeta();
  await checkTalents();
  checkSeasonConfig();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} failure(s).`);
    process.exitCode = 1;
  } else {
    console.log('No schema failures. Notes above are coverage and freshness, not errors.');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
