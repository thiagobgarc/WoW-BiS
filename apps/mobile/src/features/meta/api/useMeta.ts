/**
 * `GET /v1/meta` — the season's own description of itself.
 *
 * This is the endpoint that makes "no hardcoded season data in the mobile
 * binary" true (`architecture.md` Section 5), so it is also the only thing
 * on the device that knows what season it is.
 *
 * It lives here, in the `meta` bounded context, rather than inline in the
 * screen that first needed it. Phase 5 put it in `SearchScreen` because one
 * screen used it; Phase 7 made that two — the upgrade board's quick wins
 * need the season's slot rules — and two inline `useQuery`s with the same
 * key is how a screen ends up refetching something already in the cache.
 *
 * Nothing here has a loading or an error state to render. Every caller is
 * expected to work without it: the search screen drops its season line, and
 * the upgrade board drops two of its three kinds of quick win. That is the
 * search screen's "offline is the design, not a fallback" rule (Section 10)
 * applied to the one query both screens share.
 */
import { useQuery } from '@tanstack/react-query';
import type { SeasonSlots } from '@mythos/core/bis';

import { api } from '@/lib/api';

export const metaQueryKey = ['meta'] as const;

/**
 * What `deriveActionGroups` is given when `/v1/meta` has not resolved, or
 * resolved from a server too old to carry `seasonSlots`.
 *
 * Empty, and never a compiled-in copy of a season's lists. A missing hint
 * costs the user a section; a hint from whatever the season looked like when
 * this binary was built is a wrong answer that looks exactly like a right
 * one. Socket quick wins are unaffected either way — they are derived from
 * the character's own equipment, which is always in hand.
 */
export const NO_SEASON_SLOTS: SeasonSlots = Object.freeze({
  enchantableSlots: [],
  embellishableSlots: [],
});

export function useMeta() {
  return useQuery({
    queryKey: metaQueryKey,
    queryFn: ({ signal }) => api.getMeta(signal),
    /**
     * Season data changes when the web app deploys, not on a clock, and
     * `api-contract.md` sizes this endpoint as "cheap, cacheable 1h
     * client-side". An hour is also comfortably inside the ~24-day ceiling
     * every duration in this app has to respect — see AGENTS.md.
     */
    staleTime: 1000 * 60 * 60,
  });
}
