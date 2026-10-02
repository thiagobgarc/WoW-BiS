/**
 * A whole `GET /v1/meta` response.
 *
 * Parsed through the contract's own schema, for the same reason
 * `characterFixture.ts` is: a fixture that drifts out of shape should fail
 * here rather than pass a screen test with data the server could never
 * send.
 *
 * `seasonSlots` is present, which is the interesting half — it is what the
 * upgrade board's enchant and embellishment quick wins are derived from,
 * and the field is optional on the wire, so the tests that matter are the
 * one where it is here and the one where it is not (see
 * `META_WITHOUT_SEASON_SLOTS`).
 */
import { MetaResponseSchema, type MetaResponse } from '@mythos/api-contract';

import { SEASON_SLOTS } from './bisFixture';

export const META_FIXTURE: MetaResponse = MetaResponseSchema.parse({
  season: {
    id: 'tww-s2',
    displayName: 'The War Within Season 2',
    raidName: 'The Venomous Abyss',
  },
  seededSpecs: [{ class: 'Death Knight', spec: 'Unholy', armorType: 'plate' }],
  minimumSupportedClientVersion: '0.0.0',
  notice: null,
  seasonSlots: SEASON_SLOTS,
});

/** A server too old to carry the field — see MetaResponseSchema on why. */
export const META_WITHOUT_SEASON_SLOTS: MetaResponse = MetaResponseSchema.parse({
  ...META_FIXTURE,
  seasonSlots: undefined,
});
