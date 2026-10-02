/**
 * Link-preview card for a spec's guide pages, in the class color. Shared by
 * the BiS and talent-build pages, so the subtitle names both.
 */
import type { APIRoute } from 'astro';
import { renderCard } from '@/lib/og/card';
import { findSpecBySlug } from '@/lib/meta/specBySlug';
import { seasonConfig } from '@/lib/season/seasonConfig';
import { classColor } from '@mythos/core/utils';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const ref = findSpecBySlug(params.class!, params.spec!.replace(/\.png$/, ''));
  // Nothing links to an unknown spec's card, and rendering one per made-up URL
  // is free CPU for anyone who asks — so no render at all.
  if (!ref) return new Response('Not found', { status: 404 });
  return renderCard({
    eyebrow: `Mythos · ${seasonConfig.displayName}`,
    title: `${ref.specName} ${ref.className}`,
    subtitle: 'Best-in-slot gear and talent build for raid and Mythic+.',
    accent: classColor(ref.className),
  });
};
