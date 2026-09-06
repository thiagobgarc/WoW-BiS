/**
 * Unified cache interface with two backends:
 *  - Upstash Redis (REST-based, works from serverless/edge) when
 *    UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set.
 *  - An in-memory Map fallback otherwise, so the app runs locally with
 *    zero infra. The in-memory store is per-process — fine for local dev,
 *    not for a multi-instance deployment, which is exactly why it's only
 *    ever a fallback.
 */
import { Redis } from '@upstash/redis';

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

class InMemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class UpstashCache implements Cache {
  constructor(private client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { ex: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

let cache: Cache | null = null;

export function getCache(): Cache {
  if (cache) return cache;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    cache = new UpstashCache(new Redis({ url, token }));
  } else {
    cache = new InMemoryCache();
  }

  return cache;
}

/** Test-only escape hatch to reset the module-level singleton between tests. */
export function __resetCacheForTests(): void {
  cache = null;
}
