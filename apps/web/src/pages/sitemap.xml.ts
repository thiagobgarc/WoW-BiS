/**
 * The indexable, enumerable pages: home, the two hubs, and each spec's
 * talent-build and BiS pages. Character pages are left out — there are
 * millions of possible ones and they're discovered through links, not
 * enumeration.
 */
import type { APIRoute } from 'astro';
import { bisPath, specsByClass, talentBuildPath } from '@/lib/meta/specLinks';

export const prerender = false;

export const GET: APIRoute = ({ site, url }) => {
  const origin = site ?? url.origin;
  const specPaths = specsByClass().flatMap(({ className, specs }) =>
    specs.flatMap((spec) => [talentBuildPath(className, spec), bisPath(className, spec)]),
  );
  const urls = ['/', '/bis', '/meta', ...specPaths]
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
