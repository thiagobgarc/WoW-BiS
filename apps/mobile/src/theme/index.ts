/**
 * Theme tokens for the mobile app.
 *
 * v1 is dark-only (architecture.md Section 8.9), but the shape here is the
 * part that has to survive light mode being added later: everything static
 * hangs off `themes[name]`, so a light palette is a new key plus a provider
 * that picks one — not a rewrite of every call site. Nothing outside this
 * module hardcodes a hex.
 *
 * Two kinds of token live here for two different reasons:
 *
 *   - Static tokens are literals in tailwind.config.js, so `bg-panel` and
 *     `text-severity-gap` are plain compile-time classes.
 *   - Accent tokens are CSS variables, because the accent is the looked-up
 *     character's class color — it changes at runtime, per character, exactly
 *     as it does on the web (Layout.astro sets `--accent` inline). NativeWind's
 *     `vars()` is the RN equivalent of that inline style.
 */
import { vars } from 'nativewind';
import { classColor } from '@mythos/core/utils';
import palette from './palette.json';

export type ThemeName = 'dark';

export const themes = {
  dark: palette.dark,
} as const satisfies Record<ThemeName, Record<string, string>>;

/** Non-negotiable WoW canon — these are the same in every theme. */
export const quality = palette.quality;
export const severity = palette.severity;

export type QualityKey = keyof typeof quality;
export type SeverityKey = keyof typeof severity;

/** Matches the web's `--accent` when no character is loaded. */
export const DEFAULT_ACCENT = '#c41e3a';

/**
 * The web writes the soft accents as `rgb(196 30 58 / 0.15)` — literal
 * because CSS can author a fixed pair. Here the accent arrives as a class
 * color at runtime, so the same two values are derived instead of listed.
 */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Darkens toward black by `amount`; the web's --accent-hover is ~20% darker. */
function darken(hex: string, amount = 0.2): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const channels = [0, 2, 4].map((i) => {
    const channel = Number.parseInt(full.slice(i, i + 2), 16);
    return Math.round(channel * (1 - amount))
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

/**
 * The style object that puts an accent in scope for every `accent-*` class
 * below it. Spread onto a wrapping View; pass a character's class name to
 * re-theme the screen, or nothing for the brand red.
 */
export function accentVars(wowClass?: string | null) {
  const accent = wowClass ? classColor(wowClass) : DEFAULT_ACCENT;
  return vars({
    '--accent': accent,
    '--accent-hover': darken(accent),
    '--accent-soft': withAlpha(accent, 0.15),
    '--accent-softer': withAlpha(accent, 0.08),
    '--accent-rule': withAlpha(accent, 0.55),
  });
}

/** For the handful of APIs that take a color prop, not a className. */
export const colors = {
  ...themes.dark,
  quality,
  severity,
  accent: DEFAULT_ACCENT,
} as const;

export { withAlpha, darken };
