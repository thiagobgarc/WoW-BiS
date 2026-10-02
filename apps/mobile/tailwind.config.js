/**
 * Mobile's Tailwind config.
 *
 * The values come from src/theme/palette.json, which holds exactly the hexes
 * apps/web declares in src/styles/global.css — architecture.md Section 7:
 * NativeWind "ports the web's Tailwind tokens as values instead of
 * re-eyeballing". A drift test (src/theme/tokens.test.ts) reads both files
 * and fails when they disagree, so "as values" doesn't decay into "roughly".
 *
 * Version note: NativeWind 4 requires Tailwind v3 (its react-native-css-interop
 * peer-depends on `tailwindcss: ~3`), while apps/web is on Tailwind v4's
 * CSS-first config. That split is deliberate, not an oversight — the two
 * apps never share a stylesheet, only these numbers. NativeWind 5 (preview
 * at time of writing) is the Tailwind v4 path; converging is a later chore,
 * not a v1 blocker.
 *
 * The `accent` family resolves through CSS variables because it is per
 * character: ThemeProvider sets --accent from the looked-up character's
 * class via classColor() in @mythos/core. Everything else is a literal.
 */
const palette = require('./src/theme/palette.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: palette.dark.bg,
        panel: { DEFAULT: palette.dark.panel, hover: palette.dark['panel-hover'] },
        border: palette.dark.border,
        text: {
          DEFAULT: palette.dark.text,
          muted: palette.dark['text-muted'],
          dim: palette.dark['text-dim'],
          faint: palette.dark['text-faint'],
        },
        link: palette.dark.link,
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          softer: 'var(--accent-softer)',
        },
        quality: palette.quality,
        severity: palette.severity,
      },
    },
  },
  plugins: [],
};
