/**
 * Shared plumbing for the /api/v1/** routes: the error envelope, the
 * rate-limit gate, and JSON response construction.
 *
 * Every /v1 route is the same three steps in the same order — validate,
 * rate-limit, compose — and the parts that aren't the composition live
 * here so the routes themselves read as just their composition.
 *
 * Nothing here touches the pre-existing /api/* routes the web app's own
 * client-side code calls. Those keep their flat `{ error, message }` body:
 * /v1 is a new, permanent, additive contract, not a migration of the old
 * one (docs/api-contract.md, "Base").
 */
import {
  isRetryableCode,
  type ApiErrorCode,
  type ApiErrorEnvelope,
} from '@mythos/api-contract';
import { toApiError } from '@/lib/http/errorResponse';
import { clientIp, rateLimit } from '@/lib/http/rateLimit';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function v1Json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

export function v1ErrorBody(code: ApiErrorCode, message: string): ApiErrorEnvelope {
  return { error: { code, message, retryable: isRetryableCode(code) } };
}

export function v1ErrorResponse(status: number, code: ApiErrorCode, message: string): Response {
  return v1Json(v1ErrorBody(code, message), status);
}

/**
 * Wraps the existing toApiError() rather than restating its five typed
 * Blizzard errors: the status codes and the human-readable messages stay
 * identical to what /api/* and the character page already return, and /v1
 * adds only the envelope and the `retryable` flag on top.
 */
export function toV1Error(err: unknown): { status: number; body: ApiErrorEnvelope } {
  const { status, body } = toApiError(err);
  return { status, body: v1ErrorBody(body.error, body.message) };
}

/**
 * Returns a ready-to-send 429 when the caller is over budget, or null to
 * proceed. Keyed `v1:<route>:<ip>` so /v1 and the older /api/* routes have
 * separate budgets — a mobile client shouldn't be able to lock a browser
 * out of the web app, or vice versa.
 */
export async function v1RateLimitGate(
  route: string,
  getClientAddress: () => string,
  limit: number,
  windowSeconds: number,
): Promise<Response | null> {
  const ip = clientIp(getClientAddress);
  const result = await rateLimit(`v1:${route}:${ip}`, limit, windowSeconds);
  if (result.allowed) return null;

  return v1Json(
    {
      ...v1ErrorBody('rate_limited', 'Too many requests — please slow down.'),
      retryAfterSeconds: result.retryAfterSeconds,
    },
    429,
    { 'Retry-After': String(result.retryAfterSeconds) },
  );
}

