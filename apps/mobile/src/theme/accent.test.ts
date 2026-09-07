/**
 * The accent is the one theme value that is computed rather than authored,
 * so it is the one that can be quietly wrong. These pin the two derivations
 * against the literals apps/web hardcodes for the default brand accent.
 */
import { DEFAULT_ACCENT, darken, withAlpha } from './index';

describe('accent derivation', () => {
  it('reproduces the web --accent-soft / --accent-softer values', () => {
    // global.css: rgb(196 30 58 / 0.15) and rgb(196 30 58 / 0.08).
    expect(withAlpha(DEFAULT_ACCENT, 0.15)).toBe('rgba(196, 30, 58, 0.15)');
    expect(withAlpha(DEFAULT_ACCENT, 0.08)).toBe('rgba(196, 30, 58, 0.08)');
  });

  it('lands close to the web --accent-hover for the default accent', () => {
    // The web hardcodes #a01830; 20% toward black gives #9d182e — same
    // reading, computed. Asserted as a bound rather than an exact match so
    // this documents the intent instead of freezing an approximation.
    const hover = darken(DEFAULT_ACCENT);
    const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);

    for (let i = 0; i < 3; i += 1) {
      expect(channel(hover, i)).toBeLessThan(channel(DEFAULT_ACCENT, i) + 1);
    }
    expect(channel(hover, 0)).toBeGreaterThan(0x90);
    expect(channel(hover, 0)).toBeLessThan(0xa8);
  });

  it('expands three-digit hex, which class colors may use', () => {
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('keeps output parseable as a color after darkening a light class', () => {
    // Priest is #FFFFFF — the brightest accent the app can be handed.
    expect(darken('#FFFFFF')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
