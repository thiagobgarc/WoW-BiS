/**
 * 1200x630 link-preview card for non-character pages, in the site's own
 * visual language: dark ground, a vertical accent spine, left-aligned type.
 * Built with createElement because Astro routes can't be .tsx.
 */
import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

const BG = '#121113';
const TEXT = '#edebe8';
const MUTED = '#a8a4a0';
const BRAND_ACCENT = '#c41e3a';

export interface CardContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent?: string;
}

export function renderCard({ eyebrow, title, subtitle, accent = BRAND_ACCENT }: CardContent): ImageResponse {
  return new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          padding: '90px',
          backgroundColor: BG,
          fontFamily: 'sans-serif',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderLeft: `8px solid ${accent}`,
            paddingLeft: '56px',
          },
        },
        h('div', { style: { display: 'flex', fontSize: 30, color: MUTED, marginBottom: 20 } }, eyebrow),
        h('div', { style: { display: 'flex', fontSize: 84, fontWeight: 800, color: TEXT, lineHeight: 1.0, marginBottom: 28 } }, title),
        h('div', { style: { display: 'flex', fontSize: 36, color: MUTED, maxWidth: 900 } }, subtitle),
      ),
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
