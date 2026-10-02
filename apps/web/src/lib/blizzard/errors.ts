export class CharacterNotFoundError extends Error {
  constructor(public region: string, public realmSlug: string, public characterName: string) {
    super(`Character "${characterName}" not found on ${realmSlug} (${region})`);
    this.name = 'CharacterNotFoundError';
  }
}

/**
 * Blizzard's modern Profile API no longer exposes a distinct "private
 * profile" signal (that was a Legion-era armory toggle) — a private/never
 * logged in character 404s exactly like a nonexistent one. We keep this as
 * a separate error type because the product spec calls for a distinct
 * message, and detect it heuristically (see client.ts). If Blizzard's API
 * ever reintroduces an explicit signal, replace the heuristic there.
 */
export class CharacterPrivateError extends Error {
  constructor(public region: string, public realmSlug: string, public characterName: string) {
    super(`Character "${characterName}" profile is private`);
    this.name = 'CharacterPrivateError';
  }
}

export class RealmNotFoundError extends Error {
  constructor(public realmInput: string) {
    super(`Realm "${realmInput}" did not resolve to a known realm slug`);
    this.name = 'RealmNotFoundError';
  }
}

export class BlizzardUnavailableError extends Error {
  constructor(public status: number) {
    super(`Blizzard API unavailable (${status})`);
    this.name = 'BlizzardUnavailableError';
  }
}

export class BlizzardApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'BlizzardApiError';
  }
}

/**
 * Thrown by the ingest-only client calls when credentials are absent. The
 * character path deliberately degrades to fixture data without credentials
 * so the app runs with zero setup; the ingest must not, because its output
 * is written to Postgres and then served as real best-in-slot advice.
 */
export class BlizzardCredentialsRequiredError extends Error {
  constructor(public what: string) {
    super(
      `BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET are required to fetch ${what}. ` +
        'The ingest pipeline has no fixture fallback by design.',
    );
    this.name = 'BlizzardCredentialsRequiredError';
  }
}
