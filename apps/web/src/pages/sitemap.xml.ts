/**
 * The indexable, enumerable pages: home, the tier list, and one talent-build
 * page per spec. Character pages are left out — there are millions of
 * possible ones and they're discovered through links, not enumeration.
 */
import type { APIRoute } from 'astro';
import { SPEC_IDS, urlSlug } from '@/lib/meta/specIds';

export const prerender = false;

export const GET: APIRoute = ({ site, url }) => {
  const origin = site ?? url.origin;
  const specPaths = Object.keys(SPEC_IDS).map((key) => {
    const [className, specName] = key.split('::') as [string, string];
    return `/meta/${urlSlug(className)}/${urlSlug(specName)}`;
  });
  const urls = ['/', '/meta', ...specPaths]
    .map((path) => `  <url><loc>${new URL(path, origin).toString()}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
