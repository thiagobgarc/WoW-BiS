/**
 * The contract test the whole /v1 design leans on: every route's own output,
 * parsed against @mythos/api-contract's schemas. Drift between what a route
 * returns and what the contract promises fails here rather than on a phone
 * that shipped months ago and can't be patched.
 *
 * These call the route handlers directly rather than over HTTP — the
 * handlers are plain functions of an Astro context, so there's no server to
 * start, and what's under test is the payload shape, not Astro's routing.
 *
 * Every case runs on the mock character (no Blizzard credentials, no
 * DATABASE_URL — both stubbed off below rather than assumed absent, so a
 * developer with a populated .env doesn't accidentally point the suite at
 * the live Blizzard API).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiErrorEnvelopeSchema,
  BisSeasonResponseSchema,
  CharacterSearchResponseSchema,
  CharacterResponseSchema,
  MetaResponseSchema,
  RateLimitedEnvelopeSchema,
  RealmsResponseSchema,
} from '@mythos/api-contract';
import { CURRENT_SEASON_ID } from '@/lib/season/seasonConfig';
import { GET as getMeta } from '@/pages/api/v1/meta';
import { GET as getRealms } from '@/pages/api/v1/realms';
import { GET as getCharacterSearch } from '@/pages/api/v1/character-search';
import { __resetCacheForTests } from '@/lib/cache/cache';
import { GET as getBis } from '@/pages/api/v1/bis/[season]';
import { GET as getCharacter } from '@/pages/api/v1/character/[region]/[realm]/[name]';
import { POST as postRefresh } from '@/pages/api/v1/character/[region]/[realm]/[name]/refresh';

/**
 * Rate limits are keyed by IP against a process-wide in-memory cache, so
 * every request gets its own address — otherwise the suite's own cases
 * would eat each other's budget and the failure would look like a bug in
 * the route.
 */
let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

interface ContextOverrides {
  params?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

/**
 * The subset of Astro's APIContext these routes actually read. Cast rather
 * than constructed in full: building a real APIContext would mean stubbing
 * Astro internals that have nothing to do with the contract.
 */
function context({ params = {}, url = 'http://localhost/', headers = {} }: ContextOverrides = {}) {
  return {
    params,
    url: new URL(url),
    request: new Request(url, { headers }),
    clientAddress: nextIp(),
  } as unknown as Parameters<typeof getMeta>[0];
}

const MOCK_CHARACTER_PARAMS = { region: 'us', realm: 'illidan', name: 'arthas' };

beforeEach(() => {
  vi.stubEnv('BLIZZARD_CLIENT_ID', '');
  vi.stubEnv('BLIZZARD_CLIENT_SECRET', '');
  vi.stubEnv('DATABASE_URL', '');
});

describe('GET /v1/meta', () => {
  it('returns the current season and its seeded specs', async () => {
    const response = await getMeta(context());
    expect(response.status).toBe(200);

    const body = MetaResponseSchema.parse(await response.json());
    expect(body.season.id).toBe(CURRENT_SEASON_ID);
    expect(body.season.raidName).not.toBe('');
    // The whole point of the endpoint: a client discovers what's seeded
    // without shipping a copy of the season's spec list.
    expect(body.seededSpecs.length).toBeGreaterThan(0);
    // Same rule, applied to the season's slot rules: the mobile upgrade
    // board derives its quick wins from these, and must not ship a copy.
    expect(body.seasonSlots?.enchantableSlots.length).toBeGreaterThan(0);
    expect(body.seasonSlots?.embellishableSlots.length).toBeGreaterThan(0);
  });
});

describe('GET /v1/realms', () => {
  it('returns matching realms, flagged as mock data without credentials', async () => {
    const response = await getRealms(context({ url: 'http://localhost/api/v1/realms?region=us&q=ill' }));
    expect(response.status).toBe(200);

    const body = RealmsResponseSchema.parse(await response.json());
    expect(body.mock).toBe(true);
    expect(body.realms.every((r) => r.toLowerCase().includes('ill'))).toBe(true);
  });

  it('rejects an unknown region with the standard envelope', async () => {
    const response = await getRealms(context({ url: 'http://localhost/api/v1/realms?region=mars' }));
    expect(response.status).toBe(400);

    const body = ApiErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('invalid_region');
    // Nothing about a bad region gets better on retry.
    expect(body.error.retryable).toBe(false);
  });
});

describe('GET /v1/bis/:season', () => {
  it('returns every seeded spec for the season', async () => {
    const response = await getBis(context({ params: { season: CURRENT_SEASON_ID } }));
    expect(response.status).toBe(200);

    const body = BisSeasonResponseSchema.parse(await response.json());
    expect(body.season).toBe(CURRENT_SEASON_ID);
    expect(body.specs.length).toBeGreaterThan(0);
    expect(body.specs[0].entries.length).toBeGreaterThan(0);
  });

  it('filters to one spec when class and spec are given', async () => {
    const all = BisSeasonResponseSchema.parse(
      await (await getBis(context({ params: { season: CURRENT_SEASON_ID } }))).json(),
    );
    const target = all.specs[0];
    const query = `class=${encodeURIComponent(target.class)}&spec=${encodeURIComponent(target.spec)}`;

    const response = await getBis(
      context({
        params: { season: CURRENT_SEASON_ID },
        url: `http://localhost/api/v1/bis/${CURRENT_SEASON_ID}?${query}`,
      }),
    );

    const body = BisSeasonResponseSchema.parse(await response.json());
    expect(body.specs).toHaveLength(1);
    expect(body.specs[0].spec).toBe(target.spec);
    // Same version in both modes, so a client's ETag stays valid across them.
    expect(body.version).toBe(all.version);
  });

  it('answers 304 when the client already has the current version', async () => {
    const first = await getBis(context({ params: { season: CURRENT_SEASON_ID } }));
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await getBis(
      context({ params: { season: CURRENT_SEASON_ID }, headers: { 'If-None-Match': etag as string } }),
    );
    expect(second.status).toBe(304);
  });

  it('returns an empty spec list for a season with no seed data', async () => {
    const response = await getBis(context({ params: { season: 'no-such-season' } }));
    const body = BisSeasonResponseSchema.parse(await response.json());
    expect(body.specs).toEqual([]);
  });
});

describe('GET /v1/character/:region/:realm/:name', () => {
  it('returns the whole character screen in one payload', async () => {
    const response = await getCharacter(context({ params: MOCK_CHARACTER_PARAMS }));
    expect(response.status).toBe(200);

    const body = CharacterResponseSchema.parse(await response.json());
    expect(body.mock).toBe(true);
    expect(body.character.name).toBeTruthy();
    expect(Object.keys(body.equipment).length).toBeGreaterThan(0);
    // Gear + BiS + progression are the screen. Without these assertions the
    // response could be schema-valid and still useless — every optional
    // field null and every array empty parses fine.
    expect(body.bis.seeded).toBe(true);
    expect(body.bis.entries.length).toBeGreaterThan(0);
    expect(body.progression).not.toBeNull();
  });

  it('rejects an unknown region with the standard envelope', async () => {
    const response = await getCharacter(context({ params: { ...MOCK_CHARACTER_PARAMS, region: 'mars' } }));
    expect(response.status).toBe(400);
    expect(ApiErrorEnvelopeSchema.parse(await response.json()).error.code).toBe('invalid_region');
  });
});

describe('POST /v1/character/:region/:realm/:name/refresh', () => {
  it('returns the refreshed payload, then the cooldown envelope', async () => {
    const first = await postRefresh(context({ params: MOCK_CHARACTER_PARAMS }));
    expect(first.status).toBe(200);
    // Same shape as the GET: a client that just invalidated its cache gets
    // the new snapshot without a second round trip.
    CharacterResponseSchema.parse(await first.json());

    const second = await postRefresh(context({ params: MOCK_CHARACTER_PARAMS }));
    expect(second.status).toBe(429);

    const body = RateLimitedEnvelopeSchema.parse(await second.json());
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(second.headers.get('Retry-After')).toBe(String(body.retryAfterSeconds));
    // Still a plain error envelope, so one client-side parser covers it.
    expect(ApiErrorEnvelopeSchema.parse(body).error.retryable).toBe(true);
  });
});

describe('GET /v1/character-search', () => {
  // Raider.IO is stubbed: the contract is what this route promises a phone,
  // whatever the upstream search does.
  const upstream = (body: unknown, status = 200) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
  const match = (name: string, region: string, realm: string) => ({
    type: 'character',
    name,
    data: {
      region: { slug: region },
      realm: { name: realm, slug: 'x' },
      class: { name: 'Priest' },
      thumbnail_url: '//render.worldofwarcraft.com/us/character/x/1-avatar.jpg?alt=/x.jpg',
    },
  });

  beforeEach(() => {
    __resetCacheForTests();
    vi.restoreAllMocks();
  });

  it('returns accent-insensitive matches, ranked for the requested region', async () => {
    upstream({ matches: [match('Zoë', 'eu', 'Silvermoon'), match('Zóe', 'us', 'Eredar'), match('Zoe', 'cn', 'Loken')] });
    const response = await getCharacterSearch(context({ url: 'http://localhost/api/v1/character-search?q=zoe&region=us' }));
    expect(response.status).toBe(200);

    const body = CharacterSearchResponseSchema.parse(await response.json());
    expect(body.characters.map((c) => `${c.name}/${c.region}/${c.realmSlug}`)).toEqual([
      'Zóe/us/eredar',
      'Zoë/eu/silvermoon',
    ]);
  });

  it('answers an empty list, not an error, when the upstream search fails', async () => {
    upstream({ error: 'nope' }, 500);
    const response = await getCharacterSearch(context({ url: 'http://localhost/api/v1/character-search?q=zoe' }));
    expect(response.status).toBe(200);
    expect(CharacterSearchResponseSchema.parse(await response.json()).characters).toEqual([]);
  });

  it('answers an empty list for a query under two letters without searching', async () => {
    const fetch = upstream({ matches: [] });
    const response = await getCharacterSearch(context({ url: 'http://localhost/api/v1/character-search?q=%C3%B3' }));
    expect(CharacterSearchResponseSchema.parse(await response.json()).characters).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an unknown region with the standard envelope', async () => {
    const response = await getCharacterSearch(
      context({ url: 'http://localhost/api/v1/character-search?q=zoe&region=mars' }),
    );
    expect(response.status).toBe(400);
    expect(ApiErrorEnvelopeSchema.parse(await response.json()).error.code).toBe('invalid_region');
  });
});
