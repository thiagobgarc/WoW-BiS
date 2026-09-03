/**
 * Blizzard's actual supported region codes. Rejecting anything else at the
 * API boundary avoids firing real outbound fetches (DNS + TLS handshake)
 * for garbage input — region isn't otherwise validated before being
 * interpolated into the Blizzard API hostname (see apiHost in client.ts).
 */
export const VALID_REGIONS = ['us', 'eu', 'kr', 'tw', 'cn'] as const;
export type ValidRegion = (typeof VALID_REGIONS)[number];

export function isValidRegion(region: string): region is ValidRegion {
  return (VALID_REGIONS as readonly string[]).includes(region.toLowerCase());
}
