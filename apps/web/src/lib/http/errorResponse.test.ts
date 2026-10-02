import { describe, expect, it } from 'vitest';
import { toApiError } from './errorResponse';
import {
  BlizzardApiError,
  BlizzardUnavailableError,
  CharacterNotFoundError,
  CharacterPrivateError,
  RealmNotFoundError,
} from '@/lib/blizzard/errors';

describe('toApiError', () => {
  it('maps CharacterNotFoundError to 404 with a human message', () => {
    const { status, body } = toApiError(new CharacterNotFoundError('us', 'illidan', 'thrall'));
    expect(status).toBe(404);
    expect(body.error).toBe('character_not_found');
    expect(body.message).toContain('thrall');
    expect(body.message).not.toMatch(/at\s.*\(.*:\d+:\d+\)/); // never a raw stack frame
  });

  it('maps CharacterPrivateError to 404 with a privacy-specific message', () => {
    const { status, body } = toApiError(new CharacterPrivateError('us', 'illidan', 'arthas'));
    expect(status).toBe(404);
    expect(body.error).toBe('character_private');
    expect(body.message).toMatch(/publicly visible/i);
  });

  it('maps RealmNotFoundError to 400', () => {
    const { status, body } = toApiError(new RealmNotFoundError('Nonexistent Realm'));
    expect(status).toBe(400);
    expect(body.error).toBe('realm_not_resolved');
  });

  it('maps BlizzardUnavailableError to 503', () => {
    const { status, body } = toApiError(new BlizzardUnavailableError(503));
    expect(status).toBe(503);
    expect(body.error).toBe('blizzard_unavailable');
  });

  it('maps a generic BlizzardApiError to its status', () => {
    const { status, body } = toApiError(new BlizzardApiError('boom', 500));
    expect(status).toBe(500);
    expect(body.error).toBe('blizzard_error');
  });

  it('maps unknown errors to 500 without leaking internals', () => {
    const { status, body } = toApiError(new Error('some internal detail'));
    expect(status).toBe(500);
    expect(body.error).toBe('unknown');
    expect(body.message).not.toContain('internal detail');
  });
});
