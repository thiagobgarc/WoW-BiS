/**
 * Settings / About.
 *
 * The Blizzard IP disclaimer is a shipping requirement, not a nicety —
 * mobile-ux.md flags App Store Guideline 5.2 risk without it. It is the one
 * piece of this screen that is finished rather than stubbed.
 */
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Screen } from '@/components/Screen';
import { appVersion } from '@/lib/api';
import { queryStorage, recentStorage } from '@/lib/storage';

export default function SettingsScreen() {
  const queryClient = useQueryClient();

  function clearCaches() {
    queryClient.clear();
    queryStorage.clearAll();
    recentStorage.clearAll();
  }

  return (
    <Screen edges={{ bottom: false }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text className="mt-4 text-3xl font-bold text-text">Settings</Text>

        <View className="mt-6 rounded-xl border border-border bg-panel p-4">
          <Text className="text-xs uppercase tracking-widest text-text-faint">About</Text>
          <Text className="mt-2 text-sm text-text-muted">
            Mythos {appVersion} — best-in-slot gear planning for World of Warcraft.
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL('https://worldofwarcraft.blizzard.com')}
          >
            <Text className="mt-3 text-sm text-link">World of Warcraft</Text>
          </Pressable>
        </View>

        <View className="mt-4 rounded-xl border border-border bg-panel p-4">
          <Text className="text-xs uppercase tracking-widest text-text-faint">Storage</Text>
          <Pressable accessibilityRole="button" onPress={clearCaches} className="mt-3">
            <Text className="text-sm text-severity-gap">Clear cached data and recent characters</Text>
          </Pressable>
        </View>

        <Text className="mt-6 text-xs leading-5 text-text-faint">
          World of Warcraft and Blizzard Entertainment are trademarks or registered trademarks of
          Blizzard Entertainment, Inc. Mythos is a fan project and is not affiliated with,
          endorsed, sponsored, or specifically approved by Blizzard Entertainment.
        </Text>
      </ScrollView>
    </Screen>
  );
}
