import { isWowheadUrl } from './externalLinks';

describe('isWowheadUrl', () => {
  it('accepts the item links the API builds', () => {
    expect(isWowheadUrl('https://www.wowhead.com/item=268242')).toBe(true);
    expect(isWowheadUrl('https://wowhead.com/item=1')).toBe(true);
  });

  it.each([
    'http://www.wowhead.com/item=1',
    'https://www.wowhead.com.evil.com/item=1',
    'https://evil.com/?https://www.wowhead.com',
    'https://user@evil.com',
    'intent://scan/#Intent;scheme=zxing;end',
    'mythos://character/us/illidan/arthas',
    'javascript:alert(1)',
    '',
  ])('refuses %j', (url) => {
    expect(isWowheadUrl(url)).toBe(false);
  });
});
