import { describe, expect, it } from 'vitest';
import { apiHost } from './client';
import { BlizzardApiError } from './errors';

// Every Blizzard request carries our OAuth bearer token to this host, so
// anything that lets input steer it off Blizzard's domains leaks the token.
describe('apiHost', () => {
  it('maps each supported region to its Blizzard host', () => {
    expect(apiHost('us')).toBe('https://us.api.blizzard.com');
    expect(apiHost('EU')).toBe('https://eu.api.blizzard.com');
    expect(apiHost('cn')).toBe('https://gateway.battlenet.com.cn');
  });

  it.each(['evil.com#', 'evil.com?', 'evil.com\\','evil.com/', 'x@evil.com', '127.0.0.1:9443#', '', 'usa'])(
    'refuses %j instead of building a host from it',
    (region) => {
      expect(() => apiHost(region)).toThrow(BlizzardApiError);
    },
  );
});
