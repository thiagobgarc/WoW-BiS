/**
 * Search — the app's home, and for now the scaffold's proof of life.
 *
 * The real search UI is Phase 5. What this screen does today is deliberately
 * the most useful stub available: it runs one real request through the whole
 * shared stack — @mythos/api-client over RN's fetch, against a live /v1/meta,
 * validated by @mythos/api-contract, cached and persisted by TanStack Query,
 * styled by NativeWind. If the app boots and this screen shows a season name,
 * every seam introduced in Phases 2-4 is working on the device.
 */
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MythosApiError } from '@mythos/api-client';

import { Screen } from '@/components/Screen';
import { api, apiBaseUrl, appVersion } from '@/lib/api';

export default function SearchScreen() {
  const meta = useQuery({
    queryKey: ['meta'],
    queryFn: ({ signal }) => api.getMeta(signal),
  });

  return (
    <Screen edges={{ bottom: false }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text className="mt-4 text-3xl font-bold text-text">Mythos</Text>
        <Text className="mt-1 text-base text-text-muted">
          Search is Phase 5. This screen currently verifies the API connection.
        </Text>

        <View className="mt-6 rounded-xl border border-border bg-panel p-4">
          <Text className="text-xs uppercase tracking-widest text-text-faint">API</Text>
          <Text className="mt-1 text-sm text-text-dim">{apiBaseUrl}</Text>

          {meta.isPending ? (
            <View className="mt-4 flex-row items-center gap-2">
              <ActivityIndicator />
              <Text className="text-sm text-text-muted">Contacting /v1/meta…</Text>
            </View>
          ) : null}

          {meta.isError ? <ApiFailure error={meta.error} /> : null}

          {meta.data ? (
            <View className="mt-4">
              <Text className="text-lg font-semibold text-text">{meta.data.season.displayName}</Text>
              <Text className="mt-1 text-sm text-text-muted">{meta.data.season.raidName}</Text>
              <Text className="mt-3 text-sm text-severity-bis">
                {meta.data.seededSpecs.length} seeded spec
                {meta.data.seededSpecs.length === 1 ? '' : 's'}
              </Text>
              {meta.data.notice ? (
                <Text className="mt-3 text-sm text-severity-close">{meta.data.notice}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <Text className="mt-6 text-xs text-text-faint">Mythos {appVersion}</Text>
      </ScrollView>
    </Screen>
  );
}

/**
 * Per-code error copy is a v1 requirement (mobile-ux.md's ErrorState row),
 * not a nicety — "something went wrong" is indistinguishable from a private
 * profile, and the two need different actions from the user. This is the
 * minimal version of that; the full screen set lands with the real screens.
 */
function ApiFailure({ error }: { error: Error }) {
  const code = error instanceof MythosApiError ? error.code : 'unknown';

  return (
    <View className="mt-4">
      <Text className="text-sm font-semibold text-severity-gap">Couldn't reach the API</Text>
      <Text className="mt-1 text-sm text-text-muted">{error.message}</Text>
      <Text className="mt-2 text-xs text-text-faint">code: {code}</Text>
    </View>
  );
}
