/**
 * Regenerates every app icon from the web app's brand mark.
 *
 * The icons are committed, so this is not part of a build — it is the record
 * of *where they came from*, which a set of PNGs cannot carry on its own.
 * Run it when the mark changes: `bun run icons`.
 *
 * The mark itself is copied from apps/web/public/favicon.svg rather than
 * imported, because it is four numbers that have never changed and reading
 * across app boundaries to fetch them would be the more surprising thing.
 * If the web mark is ever redrawn, redraw MARK below to match.
 */
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = fileURLToPath(new URL('../assets/', import.meta.url));
const NAVY = '#0a0e27';
const CRIMSON = '#c41e3a';

// apps/web/public/favicon.svg's mark, scaled from its 32-unit viewBox by 32.
// Kept identical rather than redrawn: the phone icon and the browser tab
// should be the same mark, and "roughly the same shield" is worse than
// either a shared one or a deliberately different one.
const MARK = 'M512 192 L768 384 L672 832 L352 832 L256 384 Z';

/**
 * Android crops an adaptive icon's foreground to the inner 66% of the
 * canvas — a circle on Pixel, a squircle elsewhere — so anything drawn to
 * the edge of the safe *box* still loses its corners to the mask. The mark
 * is 512x640, a 819px diagonal against a 676px safe circle, and the first
 * build of this icon had the pentagon's base sliced off in the launcher.
 * 0.78 brings the diagonal inside it with a little room to spare.
 */
const SAFE_ZONE_SCALE = 0.78;
const inSafeZone = (body) =>
  `<g transform="translate(512 512) scale(${SAFE_ZONE_SCALE}) translate(-512 -512)">${body}</g>`;

const svg = (body, size = 1024) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`,
  );

const png = (buf, size, file) =>
  sharp(buf, { density: 384 }).resize(size, size).png().toFile(OUT + file);

const mark = (fill) => `<path d="${MARK}" fill="${fill}"/>`;
const field = `<rect width="1024" height="1024" fill="${NAVY}"/>`;

await Promise.all([
  // iOS and the generic icon: full-bleed, square, opaque. No rounded corners
  // and no alpha — the OS masks it, and shipping a pre-rounded icon is how
  // you get a dark halo inside Apple's own corner radius. Not inset: Apple's
  // squircle barely crops, so the mark can use the room.
  png(svg(field + mark(CRIMSON)), 1024, 'icon.png'),

  // Android adaptive icon, foreground inset to survive every launcher mask.
  png(svg(field), 1024, 'android-icon-background.png'),
  png(svg(inSafeZone(mark(CRIMSON))), 1024, 'android-icon-foreground.png'),

  // Themed icons: the launcher recolors this from the wallpaper palette and
  // reads only the alpha channel, so the mark is a white silhouette — and it
  // is masked exactly like the foreground, so it is inset exactly like it.
  png(svg(inSafeZone(mark('#ffffff'))), 1024, 'android-icon-monochrome.png'),

  // Splash. Transparent: app.config.ts supplies the navy behind it, which is
  // also the window background, so there is no seam while the JS boots.
  png(svg(mark(CRIMSON)), 512, 'splash-icon.png'),

  // Expo web's tab icon — the one place the web favicon's rounded square is
  // right, because nothing masks it.
  png(svg(`<rect width="1024" height="1024" rx="192" fill="${NAVY}"/>` + mark(CRIMSON)), 96, 'favicon.png'),
]);

console.log('wrote 6 icons');
