/**
 * One error type for everything that can go wrong calling /v1, so app code
 * has a single `catch` and a single thing to branch on.
 *
 * The vocabulary is the contract's ApiErrorCode plus two codes only a client
 * can produce: the request never reached the server, or it came back as
 * something the contract doesn't describe. Both are real failures a UI has
 * to say something about, and neither can ever appear in a server payload —
 * hence extending the enum here rather than widening the contract's.
 */
import { isRetryableCode, type ApiErrorCode } from '@mythos/api-contract';

export type ClientErrorCode = ApiErrorCode | 'network' | 'invalid_response';

export interface MythosApiErrorInit {
  code: ClientErrorCode;
  message: string;
  /** Absent for network/parse failures, which never got an HTTP status. */
  status?: number;
  retryable?: boolean;
  /** Present on a 429 — how long to wait before trying again. */
  retryAfterSeconds?: number;
  cause?: unknown;
}

export class MythosApiError extends Error {
  readonly code: ClientErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor({ code, message, status, retryable, retryAfterSeconds, cause }: MythosApiErrorInit) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'MythosApiError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.retryable = retryable ?? defaultRetryable(code);
  }
}

/**
 * A dropped connection is the most retryable thing there is — it's the
 * normal state of a phone moving between cells. A response that doesn't
 * match the contract is the least: retrying gets the same malformed body,
 * and the fix is a deploy.
 *
 * For server-reported codes this defers to the contract's own table, but
 * the server also sends `retryable` on the wire and that value wins — the
 * client reads the flag rather than re-deriving it, so the two can't
 * disagree if the table ever changes.
 */
function defaultRetryable(code: ClientErrorCode): boolean {
  if (code === 'network') return true;
  if (code === 'invalid_response') return false;
  return isRetryableCode(code);
}
