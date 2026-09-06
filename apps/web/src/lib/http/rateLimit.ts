/**
 * Fixed-window rate limiter built on the app's existing Cache abstraction
 * (Redis in prod, in-memory locally) — deliberately not a dedicated
 * rate-limiting library/service, so it keeps working with zero infra like
 * the rest of the app (see cache.ts). Not perfectly atomic under heavy
 * concurrent load from a single key (get-then-set, not a native INCR), so
 * a determined attacker racing requests could squeeze a few extra through
 * right at the window boundary — that's an accepted tradeoff for a
 * lightweight abuse deterrent, not a hard quota system.
 */
import { getCache } from '@/lib/cache/cache';

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const cache = getCache();
  const cacheKey = `ratelimit:${key}`;
  const now = Date.now();

  const existing = await cache.get<Window>(cacheKey);
  if (!existing || existing.resetAt <= now) {
    await cache.set(cacheKey, { count: 1, resetAt: now + windowSeconds * 1000 }, windowSeconds);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  const remainingTtlSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  await cache.set(cacheKey, { count: existing.count + 1, resetAt: existing.resetAt }, remainingTtlSeconds);
  return { allowed: true, retryAfterSeconds: 0 };
}

// Astro.clientAddress / context.clientAddress is a getter that can throw if
// the adapter doesn't support it — accessing it must happen inside this
// try, so callers pass a thunk (`() => Astro.clientAddress`) rather than
// the value itself.
/** Best-effort caller IP for rate-limit keying — never throws. */
export function clientIp(getClientAddress: () => string): string {
  try {
    return getClientAddress();
  } catch {
    return 'unknown';
  }
}
