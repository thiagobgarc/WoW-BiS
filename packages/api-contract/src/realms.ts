/**
 * GET /v1/realms?region=us&q=are — realm autocomplete.
 *
 * `mock` is true when the server has no Blizzard credentials configured and
 * is serving its built-in realm list; clients surface that the same way the
 * web app's "Showing sample data" banner does.
 */
import { z } from 'zod';

export const RealmsResponseSchema = z.object({
  realms: z.array(z.string()),
  mock: z.boolean(),
});
export type RealmsResponse = z.infer<typeof RealmsResponseSchema>;
