/**
 * What each failure code says on screen.
 *
 * mobile-ux.md's `ErrorState` row: "per-error-code screens driven by the
 * `code` field in the error envelope". The point of branching on `code` and
 * not on the server's `message` is that a code is a contract and a message
 * is copy — api-contract.md says outright that messages may change freely
 * and clients must never match on them. So the server's message is used as
 * the *detail* line where it adds something, and the title and the advice
 * are ours.
 *
 * This is only ever reached when there is no snapshot to render. A failure
 * with a cached character behind it is a banner, not a screen — see
 * `snapshot.ts`.
 */
import { MythosApiError, type ClientErrorCode } from '@mythos/api-client';

export interface ErrorCopy {
  title: string;
  body: string;
  /** False when retrying cannot possibly change the answer. */
  canRetry: boolean;
}

const COPY: Record<ClientErrorCode, Omit<ErrorCopy, 'canRetry'>> = {
  character_not_found: {
    title: "We couldn't find that character",
    body: 'Check the name and realm. A character has to have logged in at least once for Blizzard to know about it.',
  },
  character_private: {
    title: 'This profile is private',
    body: "The character's armory profile is hidden. Only its owner can make it visible again, in-game under Interface options.",
  },
  realm_not_resolved: {
    title: "That realm didn't resolve",
    body: 'The realm name may be spelled differently in this region, or it may have been merged into another one.',
  },
  blizzard_unavailable: {
    title: 'Blizzard is unreachable',
    body: "Blizzard's armory service is down or in maintenance. This usually clears on its own.",
  },
  blizzard_error: {
    title: 'Blizzard returned an error',
    body: 'The armory answered, but not with anything we could use. Trying again in a moment usually works.',
  },
  rate_limited: {
    title: 'Too many lookups',
    body: "You've made a lot of requests in a short time. Give it a minute and try again.",
  },
  invalid_region: {
    title: 'Unsupported region',
    body: 'Mythos looks characters up in the US, EU, KR and TW regions.',
  },
  update_required: {
    title: 'Update Mythos to continue',
    body: 'This version is too old for the current server. Update from the App Store or Play Store.',
  },
  network: {
    title: "Can't reach Mythos",
    body: "You appear to be offline, and this character hasn't been opened on this device before, so there's no saved copy to show.",
  },
  invalid_response: {
    title: 'Something changed on the server',
    body: "Mythos sent data this version doesn't understand. Updating the app usually fixes it.",
  },
  unknown: {
    title: 'Something went wrong',
    body: 'That lookup failed for a reason we could not identify.',
  },
};

/** Not-an-api-error covers a thrown string, a bug in a hook, anything else. */
export function characterErrorCopy(error: unknown): ErrorCopy {
  if (!(error instanceof MythosApiError)) {
    return { ...COPY.unknown, canRetry: true };
  }
  return { ...COPY[error.code], canRetry: error.retryable };
}

/**
 * The one failure that never reaches the API: a deep link carrying a region
 * this build doesn't know, e.g. `mythos://character/mars/illidan/arthas`.
 * Rendered as the same screen rather than a special case, because to the
 * person holding the phone it is the same event.
 */
export function unsupportedRegionCopy(region: string | undefined): ErrorCopy {
  return {
    title: 'Unsupported region',
    body: region
      ? `"${region}" isn't a region Mythos supports. Characters can be looked up in the US, EU, KR and TW regions.`
      : 'That link is missing a region. Characters can be looked up in the US, EU, KR and TW regions.',
    canRetry: false,
  };
}
