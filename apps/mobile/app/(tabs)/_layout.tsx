/**
 * The v1 tab bar: Search and Settings, with the 1.1 Meta slot present but
 * hidden (`href: null`) — see src/features.ts for why it exists at all.
 *
 * Character is deliberately not a tab. It is pushed from Search or opened
 * from a deep link (mobile-ux.md, "Navigation shape"), so it lives in the
 * root Stack rather than here.
 */
import { Tabs } from 'expo-router';

import { Icon } from '@/components/Icon';
import { FEATURES } from '@/features';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors['text-dim'],
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Icon name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="meta"
        options={{
          title: 'Meta',
          href: FEATURES.meta ? undefined : null,
          tabBarIcon: ({ color, size }) => <Icon name="trophy-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Icon name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
