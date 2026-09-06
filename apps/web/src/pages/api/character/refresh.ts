import type { APIRoute } from 'astro';
import { z } from 'zod';
import { refreshCharacter } from '@/lib/blizzard/client';
import { toCharacterKey } from '@/lib/blizzard/getFullCharacter';
import { isValidRegion } from '@/lib/http/validateRegion';
import { rateLimit, clientIp } from '@/lib/http/rateLimit';

export const prerender = false;

const RefreshBodySchema = z.object({
  region: z.string().min(1).max(8),
  realm: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let parsed: z.infer<typeof RefreshBodySchema>;
  try {
    parsed = RefreshBodySchema.parse(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body', message: 'Request body is missing or malformed.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidRegion(parsed.region)) {
    return new Response(JSON.stringify({ error: 'invalid_region', message: `Unknown region "${parsed.region}".` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = clientIp(() => clientAddress);
  const limit = await rateLimit(`refresh:${ip}`, 10, 60);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited', message: 'Too many requests — please slow down.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  const key = toCharacterKey(parsed.region, parsed.realm, parsed.name);
  const result = await refreshCharacter(key);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 429,
    headers: { 'Content-Type': 'application/json' },
  });
};
