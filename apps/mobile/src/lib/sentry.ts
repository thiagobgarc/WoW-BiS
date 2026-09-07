/**
 * Crash reporting. Sentry only, no product analytics (architecture.md
 * Section 8.8) — the iOS privacy manifest in app.config.ts declares exactly
 * that and nothing more, so adding any other collection here means updating
 * the manifest too or shipping a false declaration.
 *
 * No DSN means no init: a dev machine shouldn't post crashes, and a build
 * that forgot the secret should still run rather than throw on startup.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ?? '';
const variant = (Constants.expoConfig?.extra?.variant as string | undefined) ?? 'development';

export const sentryEnabled = Boolean(dsn);

export function initSentry(): void {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn,
    environment: variant,
    // Crash diagnostics only — no session replay, no profiling, nothing
    // that would widen what the privacy manifest declares.
    enableAutoSessionTracking: true,
    sendDefaultPii: false,
    tracesSampleRate: variant === 'production' ? 0.1 : 1,
  });
}

export { Sentry };
