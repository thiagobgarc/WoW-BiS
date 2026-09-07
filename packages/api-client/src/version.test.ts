import { describe, expect, it } from 'vitest';
import { compareVersions, isClientOutdated } from './version';

describe('isClientOutdated', () => {
  it('lets the exact minimum through', () => {
    // minimumSupportedClientVersion is the oldest *supported* version, not
    // the first unsupported one — an off-by-one here bricks a working build.
    expect(isClientOutdated('1.2.0', '1.2.0')).toBe(false);
  });

  it('blocks anything below the minimum', () => {
    expect(isClientOutdated('1.1.9', '1.2.0')).toBe(true);
    expect(isClientOutdated('0.9.0', '1.0.0')).toBe(true);
  });

  it('lets anything above the minimum through', () => {
    expect(isClientOutdated('1.2.1', '1.2.0')).toBe(false);
    expect(isClientOutdated('2.0.0', '1.9.9')).toBe(false);
  });

  it("does not gate anything when the server hasn't set a minimum", () => {
    expect(isClientOutdated('1.0.0', '0.0.0')).toBe(false);
  });
});

describe('compareVersions', () => {
  it('compares numerically, not lexically', () => {
    // The bug this exists to prevent: '10' < '9' as strings.
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('2.0.0', '10.0.0')).toBe(-1);
  });

  it('treats a prerelease as its release version', () => {
    expect(compareVersions('1.2.0-beta.3', '1.2.0')).toBe(0);
    expect(compareVersions('v1.2.0', '1.2.0')).toBe(0);
  });

  it('pads missing segments with zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1', '1.0.1')).toBe(-1);
  });

  it('sorts garbage as 0 rather than throwing', () => {
    expect(compareVersions('not-a-version', '0.0.0')).toBe(0);
  });
});
