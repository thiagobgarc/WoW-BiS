/**
 * Item URLs arrive from the API, and Linking.openURL will launch any scheme
 * it's handed — other apps' deep links included. Only Wowhead over HTTPS
 * gets opened.
 */
export function isWowheadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'www.wowhead.com' || parsed.hostname === 'wowhead.com');
  } catch {
    return false;
  }
}
