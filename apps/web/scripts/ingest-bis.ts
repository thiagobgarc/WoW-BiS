/**
 * Derives BiS lists for every spec from Blizzard's own loot tables and writes
 * them to /data/bis/{season} as versioned JSON.
 *
 * Run with `bun run bis:ingest` (needs BLIZZARD_CLIENT_ID/SECRET).
 * Then `bun run db:seed` loads the JSON into Postgres, exactly as it already
 * does for hand-authored seeds — this job deliberately does not write to the
 * database itself, so that the generated lists land as a reviewable diff
 * before anything serves them.
 *
 * Flags:
 *   --dry-run      derive and report, write nothing
 *   --region=us    which regional API to read (default us; static data is
 *                  identical across regions, this only affects the host)
 *   --season=...   defaults to CURRENT_SEASON_ID
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BisListSchema } from '@mythos/core/bis';
import { specSlug } from '../src/lib/ingest/specCatalogue';
import { CURRENT_SEASON_ID, seasonConfig } from '../src/lib/season/seasonConfig';
import { runIngest } from '../src/lib/ingest/runIngest';

function flag(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const DRY_RUN = process.argv.includes('--dry-run');
const REGION = flag('region', 'us');
const SEASON = flag('season', CURRENT_SEASON_ID);

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

async function main(): Promise<void> {
  const { lists, report } = await runIngest(REGION, seasonConfig, SEASON, (m) => console.log(m));

  console.log('');
  console.log(`Season   ${report.season}  (region ${report.region})`);
  console.log(`Raid     ${report.raid ?? 'UNRESOLVED'}`);
  console.log(`Dungeons ${report.dungeons.length}: ${report.dungeons.join(', ')}`);
  console.log(
    `Items    ${report.uniqueItems} distinct, ${report.itemsFetched} fetched, ` +
      `${report.itemsMissing} missing, ${report.rankableItems} rankable gear drops`,
  );
  console.log('');

  // A name that does not resolve silently removes a whole instance's loot
  // from every list, which still looks like a successful run. Fail instead.
  // A spec Blizzard knows and the catalogue does not gets no BiS list at all,
  // and nothing else in the run would say so.
  if (
    report.specsMissingFromCatalogue.length > 0 ||
    report.specsUnknownToBlizzard.length > 0 ||
    report.primaryStatMismatches.length > 0
  ) {
    console.error('Spec catalogue is out of sync with Blizzard:');
    for (const s of report.specsMissingFromCatalogue) console.error(`  missing from specCatalogue.ts: ${s}`);
    for (const s of report.specsUnknownToBlizzard) console.error(`  not published by Blizzard: ${s}`);
    for (const s of report.primaryStatMismatches) console.error(`  wrong primary stat: ${s}`);
    console.error('\nUpdate src/lib/ingest/specCatalogue.ts and re-run.');
    process.exitCode = 1;
    return;
  }

  // weaponProficiency.ts lets unknown weapon types through to every class,
  // which is only safe if a human then adds the rule.
  if (report.unknownWeaponSubclasses.length > 0) {
    console.error('Weapon types with no proficiency rule:');
    for (const s of report.unknownWeaponSubclasses) console.error(`  - ${s}`);
    console.error('\nAdd them to src/lib/ingest/weaponProficiency.ts and re-run.');
    process.exitCode = 1;
    return;
  }

  if (report.unresolved.length > 0) {
    console.error('Unresolved instance names from seasonConfig:');
    for (const name of report.unresolved) console.error(`  - ${name}`);
    console.error('\nFix the name in seasonConfig (the journal spelling wins) and re-run.');
    process.exitCode = 1;
    return;
  }

  const empty = report.specs.filter((s) => s.entryCount === 0);
  const unreviewed = report.specs.filter((s) => s.provenance === 'default');

  console.log(`${pad('SPEC', 32)}${pad('ENTRIES', 9)}${pad('SLOTS', 7)}${pad('TIER', 6)}PRIORITY`);
  for (const spec of report.specs) {
    console.log(
      pad(`${spec.class} ${spec.spec}`, 32) +
        pad(spec.entryCount, 9) +
        pad(`${spec.slotsCovered}/14`, 7) +
        pad(spec.tierPieces, 6) +
        (spec.provenance === 'curated' ? 'curated' : 'DEFAULT - unreviewed'),
    );
  }

  console.log('');
  console.log(`${report.specs.length} specs derived, ${empty.length} empty.`);
  console.log(
    `${unreviewed.length} use an unreviewed stat priority — their item picks are real, ` +
      'but the secondary-stat ordering behind the ranking has not been sim-checked.',
  );
  console.log('PvP: not derivable from journal data (vendor gear has no encounter). No PvP entries written.');

  if (report.tierSetsUnresolved.length > 0) {
    console.log(`Tier sets named in seasonConfig but absent from Blizzard: ${report.tierSetsUnresolved.join(', ')}`);
  }
  if (report.specsWithoutTierSet.length > 0) {
    console.log(
      `${report.specsWithoutTierSet.length} specs have no tier set in seasonConfig.tierSets, so their lists ` +
        'contain no tier pieces. Add the remaining set names there to close this.',
    );
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing written.');
    return;
  }

  const outDir = path.join(process.cwd(), 'data', 'bis', SEASON);
  await mkdir(outDir, { recursive: true });

  let written = 0;
  for (const list of lists) {
    if (list.entries.length === 0) continue; // never write an empty list over a real one
    BisListSchema.parse(list); // the same gate loadSeeds applies on read
    const file = path.join(outDir, `${specSlug(list.class, list.spec)}.json`);
    await writeFile(file, `${JSON.stringify(list, null, 2)}\n`, 'utf-8');
    written++;
  }

  console.log(`\nWrote ${written} seed files to data/bis/${SEASON}/`);
  console.log('Next: bun run db:seed');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
