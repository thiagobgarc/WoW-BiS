/**
 * Catches a deep link that doesn't match a route — a shared URL from a
 * newer build, or a typo'd character path.
 */
import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/Screen';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <View className="mt-8">
          <Text className="text-2xl font-bold text-text">This page doesn't exist</Text>
          <Link href="/" className="mt-4">
            <Text className="text-base text-text underline">Go to search</Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
