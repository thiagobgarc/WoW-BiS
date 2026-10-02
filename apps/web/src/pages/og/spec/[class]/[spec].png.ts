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
  if (!ref) {
    return renderCard({
      eyebrow: 'Mythos',
      title: 'Every slot you can still upgrade.',
      subtitle: 'WoW best-in-slot gear, talent builds and spec tier lists.',
    });
  }
  return renderCard({
    eyebrow: `Mythos · ${seasonConfig.displayName}`,
    title: `${ref.specName} ${ref.className}`,
    subtitle: 'Best-in-slot gear and talent build for raid and Mythic+.',
    accent: classColor(ref.className),
  });
};
