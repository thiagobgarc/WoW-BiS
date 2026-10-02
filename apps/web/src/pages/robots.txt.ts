/**
 * Served dynamically (not from /public) so the Sitemap line carries the real
 * origin. /og/ stays crawlable on purpose: Twitterbot honors robots.txt and
 * would otherwise drop character link-preview images.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ site, url }) => {
  const sitemap = new URL('/sitemap.xml', site ?? url.origin).toString();
  const body = ['User-agent: *', 'Disallow: /api/', '', `Sitemap: ${sitemap}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
