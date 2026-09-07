/**
 * Blizzard's actual supported region codes. Rejecting anything else at the
 * API boundary avoids firing real outbound fetches (DNS + TLS handshake)
 * for garbage input — region isn't otherwise validated before being
 * interpolated into the Blizzard API hostname (see apiHost in client.ts).
 *
 * The list itself lives in @mythos/api-contract as of Phase 3, so the
 * server and the mobile client validate against the same one: a client that
 * thinks a region is valid and a server that doesn't would just produce a
 * confusing 400 on the phone.
 */
import { REGIONS, type Region } from '@mythos/api-contract';

export const VALID_REGIONS = REGIONS;
export type ValidRegion = Region;

export function isValidRegion(region: string): region is ValidRegion {
  return (VALID_REGIONS as readonly string[]).includes(region.toLowerCase());
}
