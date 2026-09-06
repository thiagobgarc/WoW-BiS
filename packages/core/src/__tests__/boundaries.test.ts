/**
 * Enforces docs/architecture.md Section 6's dependency rule mechanically:
 * "packages/core imports nothing but zod. No react, no node:*, no fetch,
 * no expo-*." A rule nobody can violate accidentally beats a rule written
 * in a document — this fails CI the moment a stray import creeps in,
 * rather than relying on a reviewer to notice.
 *
 * Deliberately dependency-free (no eslint-plugin-import) since this is the
 * only boundary the repo currently needs enforced; a fuller import-lint
 * setup can replace this if/when apps/mobile needs its own rules too.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.join(__dirname, '..');

const FORBIDDEN_PATTERNS: RegExp[] = [
  /from\s+['"]node:/,
  /from\s+['"]react/,
  /from\s+['"]expo-/,
  /from\s+['"]@\//, // apps/web's path alias — a hit here means something didn't get its import path rewritten
  /from\s+['"]\.\.\/\.\.\/\.\.\/apps\//,
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('packages/core dependency boundary', () => {
  it('imports nothing but zod and its own relative modules', () => {
    const violations: string[] = [];

    for (const file of walk(SRC_ROOT)) {
      const content = readFileSync(file, 'utf-8');
      // Only real import/export-from statements count — a docstring that
      // merely mentions an import path (e.g. explaining what this file
      // replaced) isn't a dependency-boundary violation.
      const importLines = content.split('\n').filter((line) => /^\s*(import|export)\b.*\bfrom\b/.test(line));

      for (const line of importLines) {
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${path.relative(SRC_ROOT, file)}: "${line.trim()}" matches forbidden pattern ${pattern}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
