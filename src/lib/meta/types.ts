/**
 * Meta tier-list seed schema — our own data, not Blizzard's (there's no
 * "current meta" endpoint). Mirrors talents/types.ts's shape/purpose: a
 * hand-authored JSON file per season under /data/meta, sourced from public
 * guides and refreshed periodically as the meta shifts.
 */
import { z } from 'zod';

export const MetaRoleSchema = z.enum(['dps', 'tank', 'healer']);
export type MetaRole = z.infer<typeof MetaRoleSchema>;

export const MetaContentTypeSchema = z.enum(['mythic-plus', 'raid']);
export type MetaContentType = z.infer<typeof MetaContentTypeSchema>;

export const MetaTierSchema = z.enum(['S', 'A', 'B', 'C']);
export type MetaTier = z.infer<typeof MetaTierSchema>;

export const MetaTierEntrySchema = z.object({
  class: z.string(),
  spec: z.string(),
  role: MetaRoleSchema,
  tier: MetaTierSchema,
  // Raw source score, when the source is numeric (e.g. Murlok's top-50-
  // player rating average) rather than an editorial tier call — kept for
  // provenance/re-derivation, not currently read by the UI.
  score: z.number().optional(),
});
export type MetaTierEntry = z.infer<typeof MetaTierEntrySchema>;

export const MetaTierListSchema = z.object({
  season: z.string(),
  contentType: MetaContentTypeSchema,
  lastUpdated: z.string(),
  source: z.string(),
  sourceUrls: z.array(z.string()),
  // How raw source data was turned into S/A/B/C, when that isn't just
  // "the source already used these exact tier labels" (e.g. Murlok gives a
  // continuous score, not letter tiers).
  notes: z.string().optional(),
  entries: z.array(MetaTierEntrySchema),
});
export type MetaTierList = z.infer<typeof MetaTierListSchema>;
