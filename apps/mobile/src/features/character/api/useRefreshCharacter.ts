/**
 * POST /v1/character/.../refresh — the user asking Blizzard for a new copy.
 *
 * Three things this hook exists to get right:
 *
 *  1. **The response is the new snapshot, so it is written, not discarded.**
 *     The route returns the full payload precisely so a client that just
 *     invalidated its cache doesn't pay a second round trip (api-contract.md
 *     on the refresh endpoint). `setQueryData` is that saving; an
 *     `invalidateQueries` here would throw away the payload we just got and
 *     immediately re-request it.
 *  2. **A 429 is not an error, it is a countdown.** The per-character
 *     cooldown is a normal, expected outcome of tapping refresh twice, and
 *     mobile-ux.md's `RefreshButton` row says to surface the wait rather
 *     than a bare failure. It never reaches the error branch.
 *  3. **A successful refresh starts the cooldown locally.** The server's
 *     429 reports the full 60s rather than the remainder (see cooldown.ts),
 *     so the accurate anchor is the moment our own refresh succeeded. This
 *     is what makes the control show a real countdown instead of inviting a
 *     tap that can only fail.
 */
import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MythosApiError } from '@mythos/api-client';
import type { CharacterParams, CharacterResponse } from '@mythos/api-contract';

import { api } from '@/lib/api';
import { refreshFailed, refreshSucceeded } from '@/lib/haptics';
import { characterQueryKey } from './useCharacter';
import {
  REFRESH_COOLDOWN_SECONDS,
  cooldownFrom,
  cooldownMessage,
  type CooldownUntil,
} from '../model/cooldown';
import { useCountdown } from '../model/useCountdown';

export interface RefreshController {
  refresh: () => void;
  /** Drives RefreshControl; also what disables the header button. */
  isRefreshing: boolean;
  /** Whether tapping would only produce a 429. */
  isOnCooldown: boolean;
  secondsLeft: number;
  /**
   * One line under the header: the countdown while on cooldown, the failure
   * otherwise, `null` when there is nothing to say. Never the raw error of a
   * refresh that failed because the phone is offline — the snapshot banner
   * says that, and saying it twice is noise.
   */
  message: string | null;
  /**
   * The last refresh failure, for the snapshot banner to explain.
   *
   * The banner reads the *query's* error, and a mutation's error never
   * reaches the query — so a refresh that failed while offline produced no
   * visible reaction at all, since `message` deliberately stays quiet in
   * that case. Surfacing the error here is what closes that gap: this hook
   * reports what happened, the banner decides how to say it.
   */
  error: unknown;
}

export function useRefreshCharacter(params: CharacterParams | null): RefreshController {
  const queryClient = useQueryClient();
  const [cooldownUntil, setCooldownUntil] = useState<CooldownUntil>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const secondsLeft = useCountdown(cooldownUntil);

  const mutation = useMutation({
    mutationFn: ({ target }: { target: CharacterParams }) => api.refreshCharacter(target),
    onMutate: () => setFailure(null),
    onSuccess: (fresh: CharacterResponse, { target }) => {
      queryClient.setQueryData(characterQueryKey(target.region, target.realm, target.name), fresh);
      setCooldownUntil(cooldownFrom(REFRESH_COOLDOWN_SECONDS, Date.now()));
      // A refresh that returns the same gear changes nothing on screen, so
      // this is sometimes the only signal that it worked at all.
      refreshSucceeded();
    },
    onError: (error: unknown) => {
      // Every failure branch below, the 429 included: each one means the
      // pull did not take, which is the thing worth feeling.
      refreshFailed();
      if (error instanceof MythosApiError && error.code === 'rate_limited') {
        // The server's own number, even though it is the full cooldown
        // rather than what is left — over-waiting is the safe direction.
        setCooldownUntil(cooldownFrom(error.retryAfterSeconds ?? REFRESH_COOLDOWN_SECONDS, Date.now()));
        return;
      }
      // Offline is spelled out by the snapshot banner, which reads `error`
      // below. Repeating it in this line as well would say it twice.
      if (error instanceof MythosApiError && error.code === 'network') return;
      setFailure(error instanceof MythosApiError ? error.message : "Couldn't refresh this character.");
    },
    // The cooldown, not a retry loop, is what governs how often this runs.
    retry: false,
  });

  const { mutate } = mutation;
  const isOnCooldown = secondsLeft > 0;

  const refresh = useCallback(() => {
    if (!params || isOnCooldown) return;
    mutate({ target: params });
  }, [params, isOnCooldown, mutate]);

  return {
    refresh,
    isRefreshing: mutation.isPending,
    isOnCooldown,
    secondsLeft,
    message: isOnCooldown ? cooldownMessage(secondsLeft) : failure,
    error: mutation.error,
  };
}
