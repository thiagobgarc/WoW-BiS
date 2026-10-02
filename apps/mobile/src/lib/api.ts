/**
 * The app's single MythosClient.
 *
 * @mythos/api-client takes `fetch` and `baseUrl` by injection precisely so
 * this file can decide both. RN's global fetch goes in; the base URL is
 * resolved once, here, so no screen ever builds a URL.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createMythosClient, type MythosClient } from '@mythos/api-client';

/** Set by app.config.ts from EXPO_PUBLIC_MYTHOS_API_URL. */
const configuredUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? '';

/** Astro's dev-server port; only ever used in development. */
const DEV_API_PORT = 4321;

export const appVersion = Constants.expoConfig?.version ?? '0.0.0';

/**
 * The host Metro is being served from.
 *
 * `Constants.expoConfig.hostUri` is the documented source, but it is only
 * populated when the app was opened through a manifest — in a development
 * build launched from the launcher it is undefined, which is how this was
 * found. React Native's own dev-server accessor knows the URL in every
 * development build, so it is tried first and `hostUri` is the fallback.
 *
 * The module path is a React Native internal and RN 0.86 warns about deep
 * imports, but it is the only source that answers: expo-constants leaves
 * hostUri, experienceUrl and linkingUri all undefined in a development
 * build (verified on an emulator). Wrapped so that if an upgrade moves it,
 * the app falls back rather than failing to start.
 */
function metroHost(): string | undefined {
  if (__DEV__) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer') as
        | (() => { url?: string })
        | { default: () => { url?: string } };
      const resolve = typeof getDevServer === 'function' ? getDevServer : getDevServer.default;
      const url = resolve()?.url;
      if (url) return new URL(url).hostname;
    } catch {
      // Fall through to the Expo constant.
    }
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  return hostUri?.split(':')[0];
}

/**
 * In a release build the URL is baked in. In development it usually isn't,
 * and hardcoding `localhost` would be wrong on every device that isn't the
 * one running Metro — an Android emulator's loopback is its own, and a
 * physical phone needs the laptop's LAN address. Metro already knows which
 * host the client reached it on, so borrow that and change the port.
 */
function resolveBaseUrl(): string {
  // A release build that falls through to the dev fallbacks below would
  // quietly talk plain HTTP to localhost. Fail at launch instead, where a
  // preview build catches it before a store build ever ships.
  if (!__DEV__ && !configuredUrl.startsWith('https://')) {
    throw new Error('[mythos] Release builds need EXPO_PUBLIC_MYTHOS_API_URL set to an https:// URL.');
  }
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');

  const host = metroHost();
  if (host) return `http://${host}:${DEV_API_PORT}`;

  // Last resort. 10.0.2.2 is the Android emulator's alias for the host
  // machine's loopback; on iOS the simulator shares it outright.
  console.warn('[mythos] No API URL configured and no Metro host to infer one from.');
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${DEV_API_PORT}`
    : `http://localhost:${DEV_API_PORT}`;
}

export const apiBaseUrl = resolveBaseUrl();

// Which host the app decided on is the single most useful thing to see when
// a dev build cannot reach the API.
if (__DEV__) console.log('[mythos] API base URL:', apiBaseUrl);

export const api: MythosClient = createMythosClient({
  baseUrl: apiBaseUrl,
  fetch: (input, init) => fetch(input, init),
  client: {
    version: appVersion,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  },
});
