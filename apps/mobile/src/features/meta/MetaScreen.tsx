/**
 * Meta (tier list) — 1.1, hidden behind FEATURES.meta.
 *
 * The route exists now so that turning it on later is a flag flip rather
 * than a navigation restructure; see src/features.ts.
 */
import { Text } from 'react-native';

import { Screen } from '@/components/Screen';

export default function MetaScreen() {
  return (
    <Screen>
      <Text className="mt-4 text-3xl font-bold text-text">Meta</Text>
      <Text className="mt-1 text-base text-text-muted">Tier list — planned for 1.1.</Text>
    </Screen>
  );
}
