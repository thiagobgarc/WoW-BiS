/**
 * The two /v1/meta fields that aren't derived from seasonConfig or the seed
 * data.
 *
 * Both are server-owned on purpose. `minimumSupportedClientVersion` is the
 * kill switch for a shipped build whose assumptions the API has outgrown —
 * it has to be raiseable without an app-store release, which is the whole
 * reason the field exists. `notice` is the operational banner for something
 * a user would otherwise read as our bug (a Blizzard outage, most often).
 */

/**
 * Semver. A client older than this shows the blocking update-required
 * screen. '0.0.0' gates nothing, which is correct until there is a shipped
 * client to gate — raising this before then would block a build that
 * doesn't exist yet.
 */
export const MINIMUM_SUPPORTED_CLIENT_VERSION = process.env.MYTHOS_MIN_CLIENT_VERSION ?? '0.0.0';

/** Empty/unset means no banner. Set MYTHOS_API_NOTICE to raise one. */
export function apiNotice(): string | null {
  const notice = process.env.MYTHOS_API_NOTICE?.trim();
  return notice ? notice : null;
}
