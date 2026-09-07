/**
 * Expo config, resolved per build profile.
 *
 * Three variants can be installed side by side on one device, which is the
 * whole point of varying the bundle identifier and app name: a tester with
 * the store build installed can also hold a preview build without one
 * clobbering the other. `APP_VARIANT` is set by eas.json's build profiles
 * and defaults to development for a bare `expo start`.
 *
 * Identity is settled in architecture.md Section 8.2 — bundle ID
 * `com.thiagobuenogarcia.mythos`, app name "Mythos". The store-availability
 * check for the name is still an open action item there; it is a naming
 * decision, not a code change, and touches only the strings below.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const variant = (process.env.APP_VARIANT ?? 'development') as Variant;

const BUNDLE_ID = 'com.thiagobuenogarcia.mythos';

const identity: Record<Variant, { name: string; id: string }> = {
  development: { name: 'Mythos (Dev)', id: `${BUNDLE_ID}.dev` },
  preview: { name: 'Mythos (Preview)', id: `${BUNDLE_ID}.preview` },
  production: { name: 'Mythos', id: BUNDLE_ID },
};

const { name, id } = identity[variant];

/**
 * Where /v1 lives. Empty in development on purpose: the client falls back to
 * the Metro host's origin (see src/lib/api.ts), so a phone on the same
 * network reaches the dev server without anyone editing a file. Preview and
 * production builds must set it — EAS build profiles do.
 */
const apiUrl = process.env.EXPO_PUBLIC_MYTHOS_API_URL ?? '';

/** The web app's host, for universal/app links onto character URLs. */
const webHost = process.env.MYTHOS_WEB_HOST ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: 'mythos',
  version: '0.1.0',
  orientation: 'default',
  scheme: 'mythos',
  icon: './assets/icon.png',
  // Dark-only for v1 (Section 8.9). Declaring it here stops the OS from
  // flashing a white background before the JS theme mounts.
  userInterfaceStyle: 'dark',
  backgroundColor: '#0a0e27',
  ios: {
    bundleIdentifier: id,
    supportsTablet: true,
    // Sentry collects crash diagnostics and nothing else (Section 8.8).
    // Apple requires this declared even though no data is linked to a user.
    privacyManifests: {
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
    },
    ...(webHost ? { associatedDomains: [`applinks:${webHost}`] } : {}),
  },
  android: {
    package: id,
    adaptiveIcon: {
      backgroundColor: '#0a0e27',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    ...(webHost
      ? {
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              data: [{ scheme: 'https', host: webHost, pathPrefix: '/character' }],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : {}),
  },
  plugins: [
    'expo-router',
    'expo-image',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', backgroundColor: '#0a0e27', imageWidth: 180 },
    ],
    [
      '@sentry/react-native/expo',
      {
        // Blank locally; EAS supplies them so source maps upload from CI
        // rather than from a laptop.
        organization: process.env.SENTRY_ORG ?? '',
        project: process.env.SENTRY_PROJECT ?? '',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    variant,
    apiUrl,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    // Filled in by `eas init`; see apps/mobile/README.md.
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
});
