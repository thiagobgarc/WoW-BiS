/**
 * The client half of /v1/meta's `minimumSupportedClientVersion` gate.
 *
 * Lives here rather than in the app so the rule that decides whether a build
 * is locked out is unit-tested next to the client that fetches the number,
 * not buried in a screen component. A wrong answer here either bricks a
 * working install or lets an unsupported one through.
 */

/** Numeric core of a semver string; anything unparseable sorts as 0. */
function parts(version: string): [number, number, number] {
  // Drop any prerelease/build suffix: 1.2.0-beta.3 gates as 1.2.0.
  const core = version.trim().replace(/^v/, '').split(/[-+]/)[0] ?? '';
  const [major = 0, minor = 0, patch = 0] = core
    .split('.')
    .map((n) => {
      const parsed = Number.parseInt(n, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });
  return [major, minor, patch];
}

export function compareVersions(a: string, b: string): number {
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < 3; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}

/**
 * True when the running build must show the blocking update-required screen.
 * Equal versions pass — `minimumSupportedClientVersion` is the oldest
 * version still supported, not the first unsupported one.
 */
export function isClientOutdated(currentVersion: string, minimumSupportedVersion: string): boolean {
  return compareVersions(currentVersion, minimumSupportedVersion) < 0;
}
