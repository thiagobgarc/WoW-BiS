/**
 * Who the top players of each spec are, per content type. Their gear is what
 * the BiS lists rank by, the same method Archon and Murlok use: popularity
 * among the best players, not a formula. A formula (stat fit) cannot see
 * trinket procs, weapon effects or crafted gear, which is exactly what
 * decides BiS, so it is only the fallback now.
 *
 *   - Raid: Warcraft Logs' top Mythic parses on the season's raid bosses.
 *     Needs WCL_CLIENT_ID / WCL_CLIENT_SECRET (a confidential client from
 *     warcraftlogs.com/api/clients). A rankings query costs ~1 of the 720
 *     points an hour, so one run spends roughly 2 per spec.
 *   - Mythic+: Raider.IO's per-spec rankings, ordered by M+ score. Public,
 *     no key.
 *
 * Neither source carries gear, so the caller reads each player's current
 * equipment from Blizzard. That is their current best gear rather than what
 * they wore on one pull, which is what a BiS list should reflect anyway.
 */
import type { SpecProfile } from './specCatalogue';

export interface TopPlayer {
  region: string;
  realmSlug: string;
  name: string;
}

const REGIONS = new Set(['us', 'eu', 'kr', 'tw']);

/** Blizzard realm slugs: lowercase, apostrophes dropped, spaces to hyphens. */
export function realmSlug(realmName: string): string {
  return realmName
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, '-');
}

export function urlSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export async function fetchJson(url: string, init?: RequestInit): Promise<any | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {
      // Network blip; fall through to the backoff.
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  return null;
}

/** Dedupes by region/realm/name, preserving rank order. */
function dedupe(players: TopPlayer[]): TopPlayer[] {
  const seen = new Set<string>();
  return players.filter((p) => {
    const key = `${p.region}/${p.realmSlug}/${p.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function topMythicPlusPlayers(spec: SpecProfile, season: string, pages = 2): Promise<TopPlayer[]> {
  const players: TopPlayer[] = [];
  for (let page = 0; page < pages; page++) {
    const data = await fetchJson(
      `https://raider.io/api/mythic-plus/rankings/specs?region=world&season=${season}` +
        `&class=${urlSlug(spec.class)}&spec=${urlSlug(spec.spec)}&page=${page}`,
    );
    for (const row of data?.rankings?.rankedCharacters ?? []) {
      const c = row.character;
      if (!c || !REGIONS.has(c.region?.slug)) continue; // China's armory is not on Blizzard's global API
      players.push({ region: c.region.slug, realmSlug: c.realm.slug, name: c.name });
    }
  }
  return dedupe(players);
}

export function hasWarcraftLogsCredentials(): boolean {
  return Boolean(process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET);
}

let wclToken: string | null = null;

export async function warcraftLogsQuery(query: string): Promise<any> {
  if (!wclToken) {
    const basic = Buffer.from(`${process.env.WCL_CLIENT_ID}:${process.env.WCL_CLIENT_SECRET}`).toString('base64');
    const token = await fetchJson('https://www.warcraftlogs.com/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!token?.access_token) throw new Error('Warcraft Logs rejected the client credentials');
    wclToken = token.access_token as string;
  }
  const res = await fetchJson('https://www.warcraftlogs.com/api/v2/client', {
    method: 'POST',
    headers: { Authorization: `Bearer ${wclToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res || res.errors) throw new Error(`Warcraft Logs query failed: ${JSON.stringify(res?.errors ?? 'no response')}`);
  return res.data;
}

/**
 * WCL's rankings take its slugs ("DeathKnight", "BeastMastery"), not display
 * names. Display names don't error: they silently return no rankings, which
 * would quietly drop every Death Knight, Demon Hunter and Beast Mastery.
 */
export function wclSlug(name: string): string {
  return name.replace(/\s+/g, '');
}

/** WCL's difficulty ids: 5 is Mythic. */
const MYTHIC = 5;

/**
 * Top Mythic parsers for the spec across the given encounters. Healers are
 * ranked by healing, everyone else (tanks included) by damage, matching
 * WCL's own default per role.
 */
export async function topRaidPlayers(spec: SpecProfile, encounterIds: number[]): Promise<TopPlayer[]> {
  const metric = spec.role === 'healer' ? 'hps' : 'dps';
  const players: TopPlayer[] = [];
  for (const id of encounterIds) {
    const data = await warcraftLogsQuery(
      `{ worldData { encounter(id: ${id}) { characterRankings(className: ${JSON.stringify(wclSlug(spec.class))}, ` +
        `specName: ${JSON.stringify(wclSlug(spec.spec))}, difficulty: ${MYTHIC}, metric: ${metric}) } } }`,
    );
    const rankings = data?.worldData?.encounter?.characterRankings;
    // A wrong class or spec name returns an empty object, not an error.
    if (!rankings || rankings.count === undefined) {
      throw new Error(`Warcraft Logs returned no rankings object for ${spec.spec} ${spec.class} on encounter ${id}`);
    }
    for (const row of rankings.rankings ?? []) {
      const region = String(row.server?.region ?? '').toLowerCase();
      if (!REGIONS.has(region) || !row.server?.name) continue;
      players.push({ region, realmSlug: realmSlug(row.server.name), name: row.name });
    }
  }
  return dedupe(players);
}
