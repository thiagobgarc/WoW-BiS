/**
 * Connectivity, as both TanStack Query and the UI need it.
 *
 * Two things were missing before this file existed, and they turned out to
 * be the same thing:
 *
 *  1. **`refetchOnReconnect` in queryClient.ts did nothing.** Query's
 *     `onlineManager` defaults to a browser implementation that listens for
 *     `window` online/offline events. There is no `window` in React Native,
 *     so the manager stays permanently "online" and no reconnect is ever
 *     observed. The option had been set since Phase 4 and had never once
 *     fired. Wiring the manager is what makes it real.
 *  2. **The offline banner could only appear after a request had failed.**
 *     A cold launch in airplane mode within `staleTime` refetches nothing,
 *     so there is no error to report and the screen silently shows an old
 *     snapshot as though it were live. Asking the OS is the difference
 *     between "a request failed" and "there is no network", which are
 *     different sentences to put in front of a user.
 *
 * `expo-network` rather than @react-native-community/netinfo: it ships with
 * the SDK, needs no extra config plugin, and this app only needs the one
 * boolean that both libraries agree on.
 *
 * `isInternetReachable` is preferred over `isConnected` when the platform
 * reports it, because a phone attached to a captive-portal Wi-Fi is
 * "connected" and cannot reach anything.
 */
import { useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import type { NetworkState } from 'expo-network';

function isOnline(state: NetworkState): boolean {
  // Both fields are optional; unknown is treated as online, because failing
  // a request and saying so beats refusing to try.
  if (state.isInternetReachable !== null && state.isInternetReachable !== undefined) {
    return state.isInternetReachable;
  }
  return state.isConnected ?? true;
}

/**
 * Hands Query the platform's own notion of connectivity. Called once, from
 * the root layout, before any screen mounts.
 */
export function installOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync()
      .then((state) => setOnline(isOnline(state)))
      // A platform that can't answer must not leave the app stuck offline.
      .catch(() => setOnline(true));

    const subscription = Network.addNetworkStateListener((state) => setOnline(isOnline(state)));
    return () => subscription.remove();
  });
}

/**
 * Subscribes to the same manager rather than to expo-network directly, so
 * the banner and Query can never disagree about whether the phone is online.
 */
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(() => !onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe((online) => setOffline(!online)), []);

  return offline;
}
