/**
 * The same mechanical dependency-boundary check packages/core and
 * packages/api-contract have. architecture.md Section 6: "packages/api-client
 * imports core + api-contract only; takes fetch."
 *
 * The `fetch` half of that rule is what this guards in practice. A stray
 * `node:https`, a platform SDK, or a helper that reaches for a global fetch
 * would compile fine here and then fail inside a React Native binary, where
 * the failure is a store build away from being noticed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.join(__dirname, '..');

const ALLOWED_PACKAGE_IMPORTS = [/^zod$/, /^@mythos\/core\//, /^@mythos\/api-contract$/];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('packages/api-client dependency boundary', () => {
  it('imports only zod, the Mythos packages, and its own relative modules', () => {
    const violations: string[] = [];

    for (const file of walk(SRC_ROOT)) {
      const lines = readFileSync(file, 'utf-8')
        .split('\n')
        .filter((line) => /^\s*(import|export)\b.*\bfrom\b/.test(line));

      for (const line of lines) {
        const specifier = line.match(/from\s+['"]([^'"]+)['"]/)?.[1];
        if (!specifier || specifier.startsWith('.')) continue;
        if (ALLOWED_PACKAGE_IMPORTS.some((allowed) => allowed.test(specifier))) continue;
        violations.push(`${path.relative(SRC_ROOT, file)}: "${specifier}"`);
      }
    }

    expect(violations).toEqual([]);
  });
});
