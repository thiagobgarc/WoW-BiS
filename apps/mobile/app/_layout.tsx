/**
 * Root layout: everything that must exist before any screen renders.
 *
 * Order matters here. Sentry is initialised at module scope so a crash in
 * the provider tree below is still reported. Gesture handler has to be the
 * outermost view or nothing on the screen responds to a pan. The persisted
 * query cache is restored by PersistQueryClientProvider before its children
 * mount, which is what makes a cold launch show last night's snapshot
 * instead of a spinner.
 *
 * There is deliberately no BottomSheetModalProvider here: the character
 * screen's slot sheet is a non-modal `BottomSheet` rendered in place, for
 * the painting-order reason recorded in SlotSheet.tsx.
 */
import '../global.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { installOnlineManager } from '@/lib/onlineStatus';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { Sentry, initSentry } from '@/lib/sentry';
import { DEFAULT_ACCENT, accentVars, colors } from '@/theme';

initSentry();

// Must run before any query mounts: until it does, TanStack's onlineManager
// is on its browser default and believes this device is always online.
installOnlineManager();

// Held until the tree below has mounted, so the first frame is the app and
// not a flash of the window background.
void SplashScreen.preventAutoHideAsync();

/**
 * v1 is dark-only (architecture.md Section 8.9), so this is built from
 * react-navigation's dark theme rather than switched on a color scheme.
 * When light mode arrives it becomes a lookup, not a rewrite.
 */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.panel,
    text: colors.text,
    border: colors.border,
    primary: DEFAULT_ACCENT,
  },
};

function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ThemeProvider value={navigationTheme}>
            {/* The accent lives on a wrapping View so every `accent-*` class
                below resolves. Character screens override it per class. */}
            <View style={[{ flex: 1 }, accentVars()]}>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
            </View>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrapping the root is what gives Sentry navigation breadcrumbs and the
// unhandled-error boundary; it is a no-op when no DSN is configured.
export default Sentry.wrap(RootLayout);
