/**
 * Request-side shapes and the two header names client and server both have
 * to agree on. Small enough to live in one file; kept out of the per-endpoint
 * modules so nothing has to import a sibling endpoint just for `RegionSchema`.
 */
import { z } from 'zod';

/**
 * Blizzard's actual supported region codes. Validating at the boundary keeps
 * garbage input from being interpolated into the Blizzard API hostname (see
 * apps/web's client.ts `apiHost`) and firing a real outbound DNS + TLS
 * handshake. apps/web's isValidRegion() is built on this list so the server
 * and the mobile client can't drift apart on what a valid region is.
 */
export const REGIONS = ['us', 'eu', 'kr', 'tw', 'cn'] as const;
export const RegionSchema = z.enum(REGIONS);
export type Region = z.infer<typeof RegionSchema>;

/**
 * Telemetry + version-gating hint, e.g. `mobile/1.2.0 (ios)`. Never a
 * security boundary — anything can set it, and no route's behaviour
 * changes based on it beyond what the client itself does with
 * `minimumSupportedClientVersion`.
 */
export const CLIENT_HEADER = 'X-Mythos-Client';

/** Path params for both character routes. */
export const CharacterParamsSchema = z.object({
  region: RegionSchema,
  /** Realm as typed by the user; the server slugifies it (`realmSlug()`). */
  realm: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
});
export type CharacterParams = z.infer<typeof CharacterParamsSchema>;

export const RealmsQuerySchema = z.object({
  region: RegionSchema,
  /** Autocomplete prefix/substring. Capped server-side at 32 chars. */
  q: z.string().max(32).optional(),
});
export type RealmsQuery = z.infer<typeof RealmsQuerySchema>;

/** Both or neither — a class without a spec doesn't identify a BiS list. */
export const BisQuerySchema = z
  .object({
    class: z.string().min(1).max(32).optional(),
    spec: z.string().min(1).max(32).optional(),
  })
  .refine((q) => (q.class === undefined) === (q.spec === undefined), {
    message: 'class and spec must be given together',
  });
export type BisQuery = z.infer<typeof BisQuerySchema>;
