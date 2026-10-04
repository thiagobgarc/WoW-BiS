/**
 * Checks everything `bis:ingest` depends on before the long run starts, and
 * names the culprit when something is wrong. Built after a CI run failed
 * with a bare "exit code 1": the real error was only in a log that needs
 * repo access to read.
 *
 * Never prints a secret, only whether it is set and well-formed.
 *
 * Run with `bun scripts/preflight-ingest.ts`.
 */
import { CURRENT_SEASON_ID, seasonConfig } from '../src/lib/season/seasonConfig';

const failures: string[] = [];
const ok = (msg: string) => console.log(`  ok    ${msg}`);
const fail = (msg: string) => {
  console.log(`  FAIL  ${msg}`);
  failures.push(msg);
};

console.log('Secrets');
for (const name of ['BLIZZARD_CLIENT_ID', 'BLIZZARD_CLIENT_SECRET', 'WCL_CLIENT_ID', 'WCL_CLIENT_SECRET']) {
  const value = process.env[name];
  if (!value) fail(`${name} is not set`);
  else if (value !== value.trim()) fail(`${name} has leading or trailing whitespace`);
  else if (/^["']|["']$/.test(value)) fail(`${name} is wrapped in quotes; paste the bare value`);
  else ok(`${name} is set (${value.length} chars)`);
}

async function token(label: string, url: string, id?: string, secret?: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 160).replace(/\s+/g, ' ');
      fail(`${label} token request returned HTTP ${res.status}: ${body}`);
      return null;
    }
    ok(`${label} accepted the credentials`);
    return ((await res.json()) as { access_token: string }).access_token;
  } catch (err) {
    fail(`${label} unreachable: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

console.log('\nBlizzard');
const blizzard = await token(
  'Blizzard',
  'https://oauth.battle.net/token',
  process.env.BLIZZARD_CLIENT_ID,
  process.env.BLIZZARD_CLIENT_SECRET,
);
if (blizzard) {
  const res = await fetch('https://us.api.blizzard.com/data/wow/playable-specialization/index?namespace=static-us&locale=en_US', {
    headers: { Authorization: `Bearer ${blizzard}` },
  });
  if (res.ok) ok('Blizzard game data API reachable');
  else fail(`Blizzard game data API returned HTTP ${res.status}`);
}

console.log('\nWarcraft Logs');
const wcl = await token('Warcraft Logs', 'https://www.warcraftlogs.com/oauth/token', process.env.WCL_CLIENT_ID, process.env.WCL_CLIENT_SECRET);
if (wcl) {
  const encounter = seasonConfig.raid.warcraftLogsEncounterIds[0];
  const res = await fetch('https://www.warcraftlogs.com/api/v2/client', {
    method: 'POST',
    headers: { Authorization: `Bearer ${wcl}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{ worldData { encounter(id: ${encounter}) { characterRankings(className: "Shaman", specName: "Enhancement", difficulty: 5, metric: dps) } } }`,
    }),
  });
  const body = res.ok ? ((await res.json()) as any) : null;
  const count = body?.data?.worldData?.encounter?.characterRankings?.count;
  if (!res.ok) fail(`Warcraft Logs API returned HTTP ${res.status}`);
  else if (typeof count !== 'number') fail(`Warcraft Logs API answered without rankings: ${JSON.stringify(body).slice(0, 160)}`);
  else ok(`Warcraft Logs rankings reachable (${count} parses on encounter ${encounter})`);
}

console.log('\nRaider.IO');
try {
  const res = await fetch(
    `https://raider.io/api/mythic-plus/rankings/specs?region=world&season=${seasonConfig.raiderIoSeason}&class=shaman&spec=enhancement&page=0`,
  );
  const text = await res.text();
  let rows: number | undefined;
  try {
    rows = JSON.parse(text)?.rankings?.rankedCharacters?.length;
  } catch {
    // Not JSON: typically a Cloudflare challenge page served to datacenter IPs.
  }
  if (!res.ok) fail(`Raider.IO returned HTTP ${res.status}: ${text.slice(0, 160).replace(/\s+/g, ' ')}`);
  else if (typeof rows !== 'number') fail(`Raider.IO answered with something other than rankings JSON: ${text.slice(0, 160).replace(/\s+/g, ' ')}`);
  else ok(`Raider.IO rankings reachable (${rows} players)`);
} catch (err) {
  fail(`Raider.IO unreachable: ${err instanceof Error ? err.message : String(err)}`);
}

console.log(`\nSeason ${CURRENT_SEASON_ID}`);
if (failures.length > 0) {
  console.log(`\n${failures.length} problem(s) found; fix these before the ingest can run.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
