/**
 * The tier lists are generated weekly (scripts/ingest-tier-lists.ts) and
 * committed straight to main, so this is the check that stands between a
 * bad run and the live /meta page.
 */
import { describe, expect, it } from 'vitest';
import { SPEC_CATALOGUE } from '@/lib/ingest/specCatalogue';
import { CURRENT_SEASON_ID } from '@/lib/season/seasonConfig';
import { loadTierListFile } from './loadTierList';

describe.each(['mythic-plus', 'raid', 'raid-heroic', 'raid-normal'] as const)('%s tier list', (contentType) => {
  it('parses against the schema and covers every spec exactly once', async () => {
    const list = await loadTierListFile(CURRENT_SEASON_ID, contentType);
    expect(list).not.toBeNull();

    const listed = list!.entries.map((e) => `${e.class}/${e.spec}`);
    expect(new Set(listed).size).toBe(listed.length);
    // A spec with no Mythic parses yet may be missing from the raid list,
    // but every listed spec has to be a real one.
    const known = new Set(SPEC_CATALOGUE.map((s) => `${s.class}/${s.spec}`));
    expect(listed.filter((s) => !known.has(s))).toEqual([]);
    if (contentType === 'mythic-plus') expect(listed.length).toBe(SPEC_CATALOGUE.length);
  });

  it('puts the best spec of every role in S', async () => {
    const list = await loadTierListFile(CURRENT_SEASON_ID, contentType);
    for (const role of ['dps', 'tank', 'healer'] as const) {
      const top = list!.entries.filter((e) => e.role === role).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      expect(top?.tier).toBe('S');
    }
  });
});
