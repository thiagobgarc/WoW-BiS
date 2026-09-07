/**
 * Character — pushed from Search or opened from a deep link
 * (`mythos://character/us/illidan/arthas`, or an https link once the web
 * host is configured in app.config.ts).
 *
 * Gear and Progression tabs are Phase 6/7. What this screen establishes now
 * is the two things the rest of the character UI is built on: one request
 * for the whole payload (api-contract.md's "one round trip" rule — the tabs
 * will slice this response, not fetch their own), and the per-character
 * accent, which is the same `--accent` mechanic Layout.astro uses on the web.
 */
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MythosApiError } from '@mythos/api-client';
import { RegionSchema } from '@mythos/api-contract';

import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { accentVars, colors } from '@/theme';

export default function CharacterScreen() {
  const { region, realm, name } = useLocalSearchParams<{
    region: string;
    realm: string;
    name: string;
  }>();

  // A deep link can carry any string, including one from a future build.
  // Narrowing here turns an unknown region into a rendered message instead
  // of a round trip the server has to reject with invalid_region.
  const parsed = RegionSchema.safeParse(region?.toLowerCase());
  const validRegion = parsed.success ? parsed.data : null;

  const character = useQuery({
    queryKey: ['character', validRegion, realm, name],
    queryFn: ({ signal }) => {
      if (!validRegion) throw new Error(`Unsupported region: ${region}`);
      return api.getCharacter({ region: validRegion, realm, name }, signal);
    },
    enabled: validRegion !== null,
  });

  const profile = character.data?.character;

  return (
    // Re-themes the whole subtree to the character's class color, exactly as
    // the web layout does. Falls back to the brand red until the fetch lands.
    <View style={[{ flex: 1 }, accentVars(profile?.className)]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: profile?.name ?? name,
          headerStyle: { backgroundColor: colors.panel },
          headerTintColor: colors.text,
        }}
      />
      <Screen>
        <ScrollView>
          {validRegion === null ? (
            <Text className="mt-8 text-sm font-semibold text-severity-gap">
              "{region}" isn't a region Mythos supports.
            </Text>
          ) : null}

          {character.isPending && validRegion !== null ? (
            <View className="mt-8 flex-row items-center gap-2">
              <ActivityIndicator />
              <Text className="text-sm text-text-muted">Loading {name}…</Text>
            </View>
          ) : null}

          {character.isError ? (
            <Text className="mt-8 text-sm font-semibold text-severity-gap">
              {character.error instanceof MythosApiError ? character.error.message : 'Lookup failed'}
            </Text>
          ) : null}

          {profile ? (
            <View className="mt-6 rounded-xl border border-border bg-panel p-4">
              <View className="h-1 w-12 rounded-full bg-accent" />
              <Text className="mt-3 text-2xl font-bold text-text">{profile.name}</Text>
              <Text className="mt-1 text-sm text-text-muted">
                {profile.specName ? `${profile.specName} ` : ''}
                {profile.className} · {profile.realmName} ({profile.region.toUpperCase()})
              </Text>
              <Text className="mt-3 text-sm text-text-dim">
                Item level {profile.equippedItemLevel} equipped
              </Text>
              {character.data?.stale ? (
                <Text className="mt-3 text-xs text-severity-close">
                  Showing a cached snapshot — Blizzard was unreachable.
                </Text>
              ) : null}
              <Text className="mt-6 text-xs text-text-faint">
                Gear and Progression tabs arrive in Phase 6.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </Screen>
    </View>
  );
}
