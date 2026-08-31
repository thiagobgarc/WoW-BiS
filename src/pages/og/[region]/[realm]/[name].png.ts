/**
 * Dynamic OG image for character permalinks: /character/{region}/{realm}/{name}
 * links here via <meta property="og:image">. Renders a small branded card —
 * name in class color, spec/class, realm, and average ilvl — so Discord/
 * Twitter link previews look good. Deliberately fetches only the profile
 * (not equipment/media/stats) since this only needs to be fast, not complete.
 *
 * Astro's page router only recognizes .astro/.ts/.js files, not .tsx — so
 * this builds the element tree with React.createElement instead of JSX.
 */
import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';
import { getCharacterProfile } from '@/lib/blizzard/client';
import { mapProfile } from '@/lib/blizzard/domain';
import { toCharacterKey } from '@/lib/blizzard/getFullCharacter';
import { classColor } from '@/lib/utils/classColors';

export const prerender = false;

function fallbackCard() {
  return new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0e27',
          fontFamily: 'sans-serif',
        },
      },
      h('div', { style: { display: 'flex', fontSize: 72, fontWeight: 700, color: '#c41e3a' } }, 'Mythos.'),
    ),
    { width: 1200, height: 630 },
  );
}

export const GET: APIRoute = async ({ params }) => {
  const key = toCharacterKey(params.region!, params.realm!, params.name!.replace(/\.png$/, ''));

  try {
    const { data } = await getCharacterProfile(key);
    const character = mapProfile(data, key.region);
    const accent = classColor(character.className);

    const subtitle = [character.specName, character.className].filter(Boolean).join(' ') +
      ` • ${character.realmName} (${character.region.toUpperCase()})`;

    return new ImageResponse(
      h(
        'div',
        {
          style: {
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '80px',
            backgroundColor: '#0a0e27',
            backgroundImage: `linear-gradient(135deg, ${accent}22 0%, #0a0e27 70%)`,
            fontFamily: 'sans-serif',
          },
        },
        h('div', { style: { display: 'flex', fontSize: 28, color: '#8d92a4', marginBottom: 16 } }, 'Mythos.'),
        h('div', { style: { display: 'flex', fontSize: 84, fontWeight: 700, color: accent, marginBottom: 8 } }, character.name),
        h('div', { style: { display: 'flex', fontSize: 36, color: '#e8eaed', marginBottom: 32 } }, subtitle),
        h(
          'div',
          { style: { display: 'flex', gap: 16 } },
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                fontSize: 32,
                color: '#5eb3f6',
                background: 'rgba(255,255,255,0.08)',
                padding: '12px 24px',
                borderRadius: 8,
              },
            },
            `${character.equippedItemLevel} iLvl`,
          ),
        ),
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    // A broken OG image for an invalid character isn't worth a 500 — fall back to a generic branded card.
    return fallbackCard();
  }
};
