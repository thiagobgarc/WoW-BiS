import type { APIRoute } from 'astro';
import { refreshCharacter } from '@/lib/blizzard/client';
import { toCharacterKey } from '@/lib/blizzard/getFullCharacter';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as { region: string; realm: string; name: string };
  const key = toCharacterKey(body.region, body.realm, body.name);
  const result = await refreshCharacter(key);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 429,
    headers: { 'Content-Type': 'application/json' },
  });
};
