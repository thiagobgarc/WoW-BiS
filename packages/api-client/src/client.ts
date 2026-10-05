/**
 * @mythos/api-client — the typed client for /v1.
 *
 * Two properties matter more than the ergonomics here:
 *
 * 1. `fetch` and `baseUrl` are injected, never imported. The package has to
 *    run under React Native, under Node in a test, and against a local dev
 *    server, and none of those agree on what the ambient fetch is or where
 *    the API lives (architecture.md Section 6: "DI'd fetch + baseUrl").
 * 2. Every response is parsed against @mythos/api-contract before app code
 *    sees it. A field the server stopped sending becomes a caught, typed
 *    error at the boundary instead of an `undefined` that crashes three
 *    screens later — the same discipline apps/web already applies to
 *    Blizzard's responses.
 */
import { z } from 'zod';
import {
  ApiErrorEnvelopeSchema,
  BisSeasonResponseSchema,
  CharacterSearchResponseSchema,
  CharacterResponseSchema,
  CLIENT_HEADER,
  JSON_CONTENT_TYPE,
  MetaResponseSchema,
  RateLimitedEnvelopeSchema,
  RealmsResponseSchema,
  V1_BASE_PATH,
  type BisSeasonResponse,
  type CharacterSearchResponse,
  type CharacterParams,
  type CharacterResponse,
  type MetaResponse,
  type RealmsResponse,
} from '@mythos/api-contract';
import { MythosApiError } from './errors';

/** The subset of fetch this client uses — anything compatible will do. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface MythosClientOptions {
  /** Origin of the web app, e.g. `https://mythos.example`. Trailing slash optional. */
  baseUrl: string;
  fetch: FetchLike;
  /**
   * Identifies the caller in the X-Mythos-Client header. Telemetry and
   * version-gating only — never a security boundary, since anything can set
   * it. Omit it and the header isn't sent.
   */
  client?: { version: string; platform: 'ios' | 'android' };
}

export interface BisSeasonOptions {
  /** Both or neither — a class alone doesn't identify a BiS list. */
  class?: string;
  spec?: string;
  /**
   * The `version` from a previously cached BisSeasonResponse. When the
   * season's seed data hasn't changed since, the server answers 304 and this
   * method returns null instead of re-downloading the payload.
   */
  ifNoneMatch?: string;
}

export interface MythosClient {
  getMeta(signal?: AbortSignal): Promise<MetaResponse>;
  getRealms(query: { region: string; q?: string }, signal?: AbortSignal): Promise<RealmsResponse>;
  /** Names matched without accents; region only orders the results. */
  searchCharacters(query: { q: string; region?: string }, signal?: AbortSignal): Promise<CharacterSearchResponse>;
  getCharacter(params: CharacterParams, signal?: AbortSignal): Promise<CharacterResponse>;
  refreshCharacter(params: CharacterParams, signal?: AbortSignal): Promise<CharacterResponse>;
  /** null means "your cached copy is current" — only possible with ifNoneMatch. */
  getBisSeason(season: string, options?: BisSeasonOptions, signal?: AbortSignal): Promise<BisSeasonResponse | null>;
}

export function createMythosClient({ baseUrl, fetch, client }: MythosClientOptions): MythosClient {
  const root = `${baseUrl.replace(/\/+$/, '')}${V1_BASE_PATH}`;

  function headers(extra: Record<string, string> = {}): Record<string, string> {
    const base: Record<string, string> = { Accept: JSON_CONTENT_TYPE, ...extra };
    if (client) base[CLIENT_HEADER] = `mobile/${client.version} (${client.platform})`;
    return base;
  }

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit & { allowNotModified?: boolean } = {},
  ): Promise<T | null> {
    const { allowNotModified, ...requestInit } = init;

    let response: Response;
    try {
      response = await fetch(`${root}${path}`, requestInit);
    } catch (cause) {
      // Includes an aborted request: the caller that aborted it knows why,
      // and everything else just needs "the request didn't happen".
      throw new MythosApiError({
        code: 'network',
        message: "Couldn't reach Mythos. Check your connection and try again.",
        cause,
      });
    }

    if (allowNotModified && response.status === 304) return null;
    if (!response.ok) throw await toApiError(response);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new MythosApiError({
        code: 'invalid_response',
        message: 'Mythos returned a response we could not read.',
        status: response.status,
        cause,
      });
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new MythosApiError({
        code: 'invalid_response',
        message: 'Mythos returned data in an unexpected format.',
        status: response.status,
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  /**
   * Every /v1 failure is the same envelope, so this reads code, message and
   * retryable straight off the wire. Only when the body isn't an envelope at
   * all — a proxy's HTML error page, say — does it fall back to inventing
   * one from the status.
   */
  async function toApiError(response: Response): Promise<MythosApiError> {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return unrecognizedError(response);
    }

    const rateLimited = RateLimitedEnvelopeSchema.safeParse(payload);
    if (rateLimited.success) {
      return new MythosApiError({
        code: 'rate_limited',
        message: rateLimited.data.error.message,
        status: response.status,
        retryable: true,
        retryAfterSeconds: rateLimited.data.retryAfterSeconds,
      });
    }

    const envelope = ApiErrorEnvelopeSchema.safeParse(payload);
    if (envelope.success) {
      return new MythosApiError({
        code: envelope.data.error.code,
        message: envelope.data.error.message,
        status: response.status,
        retryable: envelope.data.error.retryable,
      });
    }

    return unrecognizedError(response);
  }

  function unrecognizedError(response: Response): MythosApiError {
    return new MythosApiError({
      code: 'unknown',
      message: 'Something went wrong. Please try again.',
      status: response.status,
      // A 5xx from something that isn't even our API — a gateway, a proxy —
      // is usually transient in a way a 4xx isn't.
      retryable: response.status >= 500,
    });
  }

  /** Path segments come from user input (realm, character name) — encode them. */
  function characterPath({ region, realm, name }: CharacterParams): string {
    return `/character/${encodeURIComponent(region)}/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`;
  }

  async function required<T>(result: Promise<T | null>): Promise<T> {
    const value = await result;
    // Only a conditional GET can answer 304, and only getBisSeason sends one.
    if (value === null) {
      throw new MythosApiError({ code: 'invalid_response', message: 'Mythos returned an empty response.' });
    }
    return value;
  }

  return {
    getMeta(signal) {
      return required(request('/meta', MetaResponseSchema, { headers: headers(), signal }));
    },

    getRealms({ region, q }, signal) {
      const params = new URLSearchParams({ region });
      if (q) params.set('q', q);
      return required(request(`/realms?${params}`, RealmsResponseSchema, { headers: headers(), signal }));
    },

    searchCharacters({ q, region }, signal) {
      const params = new URLSearchParams({ q });
      if (region) params.set('region', region);
      return required(
        request(`/character-search?${params}`, CharacterSearchResponseSchema, { headers: headers(), signal }),
      );
    },

    getCharacter(params, signal) {
      return required(request(characterPath(params), CharacterResponseSchema, { headers: headers(), signal }));
    },

    refreshCharacter(params, signal) {
      return required(
        request(`${characterPath(params)}/refresh`, CharacterResponseSchema, {
          method: 'POST',
          // Required even with no body — see JSON_CONTENT_TYPE's note on
          // Astro's CSRF check and native clients sending no Origin.
          headers: headers({ 'Content-Type': JSON_CONTENT_TYPE }),
          signal,
        }),
      );
    },

    getBisSeason(season, options = {}, signal) {
      const params = new URLSearchParams();
      if (options.class && options.spec) {
        params.set('class', options.class);
        params.set('spec', options.spec);
      }
      const query = params.toString();
      const conditional: Record<string, string> = options.ifNoneMatch
        ? { 'If-None-Match': `"${options.ifNoneMatch}"` }
        : {};

      return request(
        `/bis/${encodeURIComponent(season)}${query ? `?${query}` : ''}`,
        BisSeasonResponseSchema,
        { headers: headers(conditional), signal, allowNotModified: true },
      );
    },
  };
}
