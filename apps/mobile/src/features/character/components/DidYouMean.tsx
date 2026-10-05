/**
 * Shown under a "character not found" error: the same name with its accents
 * put back, on the same realm. See accentVariants for the rule.
 *
 * Exactly one match is almost certainly the character that was meant, so
 * the screen is replaced with it (replace, not push: Back shouldn't return
 * to the 404). Several are listed for the player to pick. The web does the
 * same thing server-side with a redirect.
 */
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { CharacterParams } from '@mythos/api-contract';

import { useCharacterSuggestions } from '@/features/search/api/useCharacterSuggestions';
import { accentVariants } from '@/features/search/model/accentVariants';
import { characterRoute } from '@/features/search/model/searchForm';

export function DidYouMean({ looked }: { looked: CharacterParams }) {
  const router = useRouter();
  const { characters, isSearching } = useCharacterSuggestions(looked.region, looked.name);
  const variants = isSearching ? [] : accentVariants(characters, looked);
  const only = variants.length === 1 ? variants[0] : undefined;

  useEffect(() => {
    if (only) router.replace(characterRoute(only.region, only.realmSlug, only.name));
  }, [only, router]);

  if (variants.length < 2) return null;

  return (
    <View className="mt-6 px-2">
      <Text className="text-xs font-semibold uppercase tracking-widest text-text-dim">Did you mean</Text>
      <View accessibilityRole="list" className="mt-2 overflow-hidden rounded-xl border border-border bg-panel">
        {variants.map((c, index) => (
          <Pressable
            key={`${c.region}/${c.realmSlug}/${c.name}`}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${c.realmName}${c.className ? `, ${c.className}` : ''}`}
            onPress={() => router.replace(characterRoute(c.region, c.realmSlug, c.name))}
            className={`min-h-[48px] flex-row items-center justify-between px-4 py-2 active:bg-panel-hover ${
              index > 0 ? 'border-t border-border' : ''
            }`}
          >
            <Text className="text-base font-semibold text-text">{c.name}</Text>
            <Text className="text-xs text-text-dim">
              {c.className ? `${c.className} · ` : ''}
              {c.realmName}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
