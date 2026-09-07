/**
 * Same mechanical dependency-boundary check packages/core has, applied to
 * the contract package: architecture.md Section 6 says api-contract may
 * import zod and @mythos/core, nothing else. It's the package both the
 * server and (eventually) a React Native binary depend on, so a stray
 * `node:crypto` or `react` import here would break one of them at build
 * time rather than here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.join(__dirname, '..');

const ALLOWED_PACKAGE_IMPORTS = [/^zod$/, /^@mythos\/core\//];

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

describe('packages/api-contract dependency boundary', () => {
  it('imports only zod, @mythos/core, and its own relative modules', () => {
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
