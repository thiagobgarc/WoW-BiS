/** Site-wide link-preview image for pages that don't have a more specific one. */
import type { APIRoute } from 'astro';
import { renderCard } from '@/lib/og/card';

export const prerender = false;

export const GET: APIRoute = () =>
  renderCard({
    eyebrow: 'Mythos',
    title: 'Every slot you can still upgrade.',
    subtitle: 'WoW best-in-slot gear, talent builds and spec tier lists.',
  });
