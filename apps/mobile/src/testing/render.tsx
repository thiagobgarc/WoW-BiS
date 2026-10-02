/**
 * The provider wrapper every screen test needs.
 *
 * Screens depend on two things they never import: a Query client and safe-area
 * insets. Rendering one bare fails with "No safe area value available", which
 * reads like a bug in the screen rather than a missing test provider — so this
 * exists to make sure that mistake is only made once.
 *
 * Note `render` is asynchronous in this version of RNTL, so this returns a
 * promise and every caller must await it. Forgetting leaves the queries
 * undefined with no useful message.
 */
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { render } from '@testing-library/react-native';

/** A notched phone, so insets are non-zero and layout bugs can surface. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** A client with the same "don't retry, don't cache between tests" settings. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    // Retries would turn every error assertion into a timeout.
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

interface RenderOptions {
  /**
   * Reuse a client seeded with `setQueryData`, for the case a screen is
   * meant to render from cache — the app restores exactly that from MMKV on
   * a cold launch, so "offline, with a snapshot" has no other way to be set
   * up in a test.
   */
  queryClient?: QueryClient;
}

export async function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  function Providers({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={METRICS}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  const view = await render(ui, { wrapper: Providers });

  return { ...view, queryClient };
}
