import {
  BlizzardApiError,
  BlizzardUnavailableError,
  CharacterNotFoundError,
  CharacterPrivateError,
  RealmNotFoundError,
} from '@/lib/blizzard/errors';

export type ApiErrorCode =
  | 'character_not_found'
  | 'character_private'
  | 'realm_not_resolved'
  | 'blizzard_unavailable'
  | 'blizzard_error'
  | 'unknown';

export interface ApiErrorBody {
  error: ApiErrorCode;
  message: string;
}

/** Never a raw stack trace — every branch here is a human-readable message. */
export function toApiError(err: unknown): { status: number; body: ApiErrorBody } {
  if (err instanceof CharacterNotFoundError) {
    return {
      status: 404,
      body: {
        error: 'character_not_found',
        message: `We couldn't find a character named "${err.characterName}" on ${err.realmSlug} (${err.region.toUpperCase()}). Check the spelling and realm, then try again.`,
      },
    };
  }
  if (err instanceof CharacterPrivateError) {
    return {
      status: 404,
      body: {
        error: 'character_private',
        message: `${err.characterName}'s profile is not publicly visible. To make their character public, log in to the Blizzard Armory and change their privacy settings.`,
      },
    };
  }
  if (err instanceof RealmNotFoundError) {
    return {
      status: 400,
      body: {
        error: 'realm_not_resolved',
        message: `We couldn't match "${err.realmInput}" to a known realm. Pick a realm from the autocomplete list.`,
      },
    };
  }
  if (err instanceof BlizzardUnavailableError) {
    return {
      status: 503,
      body: {
        error: 'blizzard_unavailable',
        message: 'The Blizzard API is experiencing heavy load. Showing cached data if we have it — please retry in a moment.',
      },
    };
  }
  if (err instanceof BlizzardApiError) {
    return {
      status: err.status ?? 502,
      body: { error: 'blizzard_error', message: 'The Blizzard API returned an unexpected error.' },
    };
  }

  return { status: 500, body: { error: 'unknown', message: 'Something went wrong loading this character.' } };
}
