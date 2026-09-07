/**
 * Everything here runs against a stub fetch — the point of injecting fetch
 * is that the client's behaviour is testable without a server, and these are
 * the cases a phone actually hits: a flaky connection, a cooldown, a server
 * that shipped a response the client's build doesn't understand.
 */
import { describe, expect, it, vi } from 'vitest';
import { CLIENT_HEADER } from '@mythos/api-contract';
import { createMythosClient, type FetchLike } from './client';
import { MythosApiError } from './errors';

const META_BODY = {
  season: { id: 'midnight-s2', displayName: 'Midnight Season 2', raidName: 'The Venomous Abyss' },
  seededSpecs: [{ class: 'Mage', spec: 'Fire', armorType: 'cloth' }],
  minimumSupportedClientVersion: '0.0.0',
  notice: null,
};

const BIS_BODY = {
  season: 'midnight-s2',
  version: 'abc123',
  specs: [],
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

/** Records the calls so URL construction and headers can be asserted. */
function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fetch, calls };
}

/**
 * Asserts the call rejects and hands back the typed error. Catching inline
 * would widen the result to `Response | MythosApiError`, and a case that
 * silently resolved would pass every following expectation vacuously.
 */
async function rejection(call: Promise<unknown>): Promise<MythosApiError> {
  try {
    await call;
  } catch (error) {
    return error as MythosApiError;
  }
  throw new Error('Expected the request to reject, but it resolved.');
}

function client(fetch: FetchLike, options: Partial<Parameters<typeof createMythosClient>[0]> = {}) {
  return createMythosClient({ baseUrl: 'https://mythos.test', fetch, ...options });
}

describe('request construction', () => {
  it('builds /v1 URLs under the given base, tolerating a trailing slash', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse(META_BODY));
    await createMythosClient({ baseUrl: 'https://mythos.test/', fetch }).getMeta();

    expect(calls[0].url).toBe('https://mythos.test/api/v1/meta');
  });

  it('sends the client header only when a client identity is configured', async () => {
    const anonymous = stubFetch(() => jsonResponse(META_BODY));
    await client(anonymous.fetch).getMeta();
    expect((anonymous.calls[0].init?.headers as Record<string, string>)[CLIENT_HEADER]).toBeUndefined();

    const identified = stubFetch(() => jsonResponse(META_BODY));
    await client(identified.fetch, { client: { version: '1.2.0', platform: 'ios' } }).getMeta();
    expect((identified.calls[0].init?.headers as Record<string, string>)[CLIENT_HEADER]).toBe('mobile/1.2.0 (ios)');
  });

  it('percent-encodes character path segments', async () => {
    const { fetch, calls } = stubFetch(() =>
      jsonResponse({ error: { code: 'character_not_found', message: 'no', retryable: false } }, { status: 404 }),
    );

    await expect(
      client(fetch).getCharacter({ region: 'us', realm: "Aerie Peak", name: 'Ünicode' }),
    ).rejects.toThrow(MythosApiError);

    expect(calls[0].url).toBe('https://mythos.test/api/v1/character/us/Aerie%20Peak/%C3%9Cnicode');
  });

  it('sends a JSON content-type on refresh so Astro CSRF does not reject it', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ ...META_BODY }, { status: 500 }));
    await expect(client(fetch).refreshCharacter({ region: 'us', realm: 'illidan', name: 'arthas' })).rejects.toThrow();

    expect(calls[0].init?.method).toBe('POST');
    expect((calls[0].init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('omits the class/spec filter unless both are given', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse(BIS_BODY));
    const api = client(fetch);

    await api.getBisSeason('midnight-s2');
    await api.getBisSeason('midnight-s2', { class: 'Mage' });
    await api.getBisSeason('midnight-s2', { class: 'Mage', spec: 'Fire' });

    expect(calls[0].url).toBe('https://mythos.test/api/v1/bis/midnight-s2');
    expect(calls[1].url).toBe('https://mythos.test/api/v1/bis/midnight-s2');
    expect(calls[2].url).toBe('https://mythos.test/api/v1/bis/midnight-s2?class=Mage&spec=Fire');
  });
});

describe('conditional GET on /v1/bis/:season', () => {
  it('quotes the cached version into an If-None-Match header', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse(BIS_BODY));
    await client(fetch).getBisSeason('midnight-s2', { ifNoneMatch: 'abc123' });

    expect((calls[0].init?.headers as Record<string, string>)['If-None-Match']).toBe('"abc123"');
  });

  it('returns null on 304 rather than treating an empty body as a failure', async () => {
    const { fetch } = stubFetch(() => new Response(null, { status: 304 }));
    await expect(client(fetch).getBisSeason('midnight-s2', { ifNoneMatch: 'abc123' })).resolves.toBeNull();
  });
});

describe('error mapping', () => {
  it('reads code, message and retryable straight off the envelope', async () => {
    const { fetch } = stubFetch(() =>
      jsonResponse(
        { error: { code: 'character_private', message: "That profile isn't public.", retryable: false } },
        { status: 404 },
      ),
    );

    const error = await rejection(client(fetch).getCharacter({ region: 'us', realm: 'illidan', name: 'arthas' }));

    expect(error).toBeInstanceOf(MythosApiError);
    expect(error.code).toBe('character_private');
    expect(error.message).toBe("That profile isn't public.");
    expect(error.status).toBe(404);
    expect(error.retryable).toBe(false);
  });

  it('surfaces retryAfterSeconds from a cooldown so the UI can schedule the retry', async () => {
    const { fetch } = stubFetch(() =>
      jsonResponse(
        { error: { code: 'rate_limited', message: 'Slow down.', retryable: true }, retryAfterSeconds: 42 },
        { status: 429 },
      ),
    );

    const error = await rejection(client(fetch).refreshCharacter({ region: 'us', realm: 'illidan', name: 'arthas' }));

    expect(error.code).toBe('rate_limited');
    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(42);
  });

  it('falls back to a status-derived error when the body is not an envelope', async () => {
    const { fetch } = stubFetch(() => new Response('<html>502 Bad Gateway</html>', { status: 502 }));

    const error = await rejection(client(fetch).getMeta());

    expect(error.code).toBe('unknown');
    expect(error.status).toBe(502);
    // A gateway failing in front of the API is usually transient.
    expect(error.retryable).toBe(true);
  });

  it('reports a dropped connection as a retryable network error', async () => {
    const fetch = vi.fn<FetchLike>().mockRejectedValue(new TypeError('Network request failed'));

    const error = await rejection(client(fetch).getMeta());

    expect(error.code).toBe('network');
    expect(error.retryable).toBe(true);
    expect(error.status).toBeUndefined();
  });
});

describe('response validation', () => {
  // The reason the client parses at all: without this, a dropped field
  // reaches app code as undefined and fails somewhere unrelated.
  it('rejects a 200 whose body does not match the contract', async () => {
    const { fetch } = stubFetch(() => jsonResponse({ season: { id: 'midnight-s2' } }));

    const error = await rejection(client(fetch).getMeta());

    expect(error.code).toBe('invalid_response');
    expect(error.retryable).toBe(false);
  });

  it('rejects a 200 that is not JSON at all', async () => {
    const { fetch } = stubFetch(() => new Response('not json', { status: 200 }));

    const error = await rejection(client(fetch).getMeta());

    expect(error.code).toBe('invalid_response');
  });

  it('returns the parsed payload on success', async () => {
    const { fetch } = stubFetch(() => jsonResponse(META_BODY));
    const meta = await client(fetch).getMeta();

    expect(meta.season.id).toBe('midnight-s2');
    expect(meta.seededSpecs[0].armorType).toBe('cloth');
  });
});
