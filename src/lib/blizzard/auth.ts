/**
 * Blizzard OAuth2 client-credentials token service.
 *
 * The token is cached in the shared cache (Redis in prod, in-memory
 * locally) with TTL = expires_in - 60s so we never serve an
 * about-to-expire token. Refresh is guarded two ways against a stampede:
 *  - an in-process in-flight promise, so concurrent requests on the same
 *    instance await one shared fetch instead of firing N.
 *  - a short-lived Redis lock (SET NX) so concurrent *instances* don't all
 *    refresh at once; whichever instance loses the race just re-reads the
 *    cache after a short backoff, since the winner will have populated it.
 */
import { getCache } from '@/lib/cache/cache';

const TOKEN_CACHE_KEY = 'blizzard:oauth:token';
const LOCK_KEY = 'blizzard:oauth:lock';
const LOCK_TTL_SECONDS = 10;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let inFlightRefresh: Promise<string> | null = null;

function tokenUrl(): string {
  const region = process.env.BLIZZARD_OAUTH_REGION ?? 'us';
  return region === 'cn'
    ? 'https://www.battlenet.com.cn/oauth/token'
    : `https://${region}.battle.net/oauth/token`;
}

async function fetchNewToken(): Promise<string> {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new BlizzardCredentialsMissingError();
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(tokenUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Blizzard OAuth token request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TokenResponse;
  const cache = getCache();
  const ttl = Math.max(data.expires_in - 60, 60);
  await cache.set(TOKEN_CACHE_KEY, data.access_token, ttl);
  return data.access_token;
}

export class BlizzardCredentialsMissingError extends Error {
  constructor() {
    super('BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET are not set.');
    this.name = 'BlizzardCredentialsMissingError';
  }
}

async function refreshWithLock(): Promise<string> {
  const cache = getCache();

  // Best-effort cross-instance lock. If we can't acquire it, another
  // instance is refreshing — wait briefly and read whatever it wrote.
  const acquired = await tryAcquireLock(cache);
  if (!acquired) {
    await sleep(300);
    const cached = await cache.get<string>(TOKEN_CACHE_KEY);
    if (cached) return cached;
    // Lock holder never wrote a token (crashed?) — refresh ourselves.
  }

  try {
    return await fetchNewToken();
  } finally {
    await cache.del(LOCK_KEY);
  }
}

async function tryAcquireLock(cache: ReturnType<typeof getCache>): Promise<boolean> {
  const existing = await cache.get<string>(LOCK_KEY);
  if (existing) return false;
  await cache.set(LOCK_KEY, '1', LOCK_TTL_SECONDS);
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns a valid access token, refreshing it if missing/expired. */
export async function getBlizzardAccessToken(): Promise<string> {
  const cache = getCache();
  const cached = await cache.get<string>(TOKEN_CACHE_KEY);
  if (cached) return cached;

  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = refreshWithLock().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}
