/**
 * The mobile palette is supposed to be the web's palette, "ported as values"
 * (architecture.md Section 7). That claim rots the first time someone tweaks
 * a hex on one side, and the failure is invisible — the app still builds, it
 * just stops looking like the product.
 *
 * So this reads apps/web's stylesheet and compares. It is not a snapshot: it
 * parses the actual custom properties, which means renaming one on the web
 * fails here too, loudly, instead of silently dropping out of the comparison.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import palette from './palette.json';

const WEB_CSS = path.resolve(__dirname, '../../../web/src/styles/global.css');

/** Pulls `--name: value;` pairs out of the `:root` block. */
function webTokens(): Map<string, string> {
  const css = readFileSync(WEB_CSS, 'utf-8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('@theme'));
  const tokens = new Map<string, string>();

  for (const [, name, value] of root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    if (name && value) tokens.set(name, value.trim());
  }
  // An alias like `--color-border: var(--color-rule)` compares as the color
  // it points at, which is what the mobile palette has to hold.
  for (const [name, value] of tokens) {
    const alias = value.match(/^var\(--([\w-]+)\)$/)?.[1];
    if (alias && tokens.has(alias)) tokens.set(name, tokens.get(alias)!);
  }
  return tokens;
}

/** `rgb(255 255 255 / 0.08)` and `rgba(255, 255, 255, 0.08)` are one color. */
function normalize(value: string): string {
  const rgb = value.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+))?\s*\)/);
  if (rgb) {
    const [, r, g, b, a = '1'] = rgb;
    return `rgba(${r},${g},${b},${Number(a)})`;
  }
  return value.toLowerCase();
}

describe('mobile palette matches the web stylesheet', () => {
  const web = webTokens();

  it.each([
    ['color-bg', palette.dark.bg],
    ['color-panel', palette.dark.panel],
    ['color-panel-hover', palette.dark['panel-hover']],
    ['color-sunken', palette.dark.sunken],
    ['color-rule', palette.dark.rule],
    ['color-rule-strong', palette.dark['rule-strong']],
    ['color-border', palette.dark.border],
    ['color-text', palette.dark.text],
    ['color-text-muted', palette.dark['text-muted']],
    ['color-text-dim', palette.dark['text-dim']],
  ])('--%s', (token, mobile) => {
    expect(normalize(mobile)).toBe(normalize(web.get(token) ?? ''));
  });

  it.each(Object.entries(palette.quality))('--quality-%s', (name, mobile) => {
    expect(normalize(mobile)).toBe(normalize(web.get(`quality-${name}`) ?? ''));
  });

  it.each(Object.entries(palette.severity))('--severity-%s', (name, mobile) => {
    expect(normalize(mobile)).toBe(normalize(web.get(`severity-${name}`) ?? ''));
  });

  it('covers every color the web declares, so a new web token fails here', () => {
    const mobileTokens = new Set([
      ...Object.keys(palette.dark).map((key) => (key === 'bg' ? 'color-bg' : `color-${key}`)),
      ...Object.keys(palette.quality).map((key) => `quality-${key}`),
      ...Object.keys(palette.severity).map((key) => `severity-${key}`),
      // The accent family is derived at runtime from the character's class
      // rather than listed, so it is expected to be absent from palette.json.
      'accent',
      'accent-hover',
      'accent-soft',
      'accent-softer',
      'accent-rule',
    ]);

    expect([...web.keys()].filter((token) => !mobileTokens.has(token))).toEqual([]);
  });
});
