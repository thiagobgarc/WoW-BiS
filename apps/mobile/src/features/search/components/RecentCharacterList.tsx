/**
 * Recently viewed characters.
 *
 * The one piece of state in the app that is genuinely the user's, so it is
 * also the one thing on this screen that renders identically with the
 * network off — it comes from MMKV, synchronously, before the first frame.
 *
 * Each row carries its own class color as a left rule. Item-quality and
 * class colors are decoration only here: the class is never *encoded* by the
 * color, it is spelled out in the row's accessibility label, which is the
 * same never-color-alone rule mobile-ux.md states for severity chips.
 */
import { Pressable, Text, View } from 'react-native';
import { classColor } from '@mythos/core/utils';

import { recentKey, type RecentCharacter } from '@/features/roster/model/recentCharacters';

interface RecentCharacterListProps {
  characters: RecentCharacter[];
  onSelect: (character: RecentCharacter) => void;
  /** True when the roster has entries but the typed name filtered them all out. */
  filtered: boolean;
}

export function RecentCharacterList({ characters, onSelect, filtered }: RecentCharacterListProps) {
  if (characters.length === 0) {
    return (
      <Text className="mt-3 text-sm text-text-faint">
        {filtered
          ? 'No recent character matches that name.'
          : 'Characters you look up will appear here.'}
      </Text>
    );
  }

  return (
    <View accessibilityRole="list" className="mt-3 gap-2">
      {characters.map((character) => (
        <Pressable
          key={recentKey(character)}
          accessibilityRole="button"
          accessibilityLabel={`${character.name}, ${character.realmName}, ${character.region.toUpperCase()}${
            character.className ? `, ${character.className}` : ''
          }`}
          onPress={() => onSelect(character)}
          className="min-h-11 flex-row items-center overflow-hidden rounded-xl border border-border bg-panel active:bg-panel-hover"
        >
          <View
            className="h-full w-1 self-stretch"
            style={{ backgroundColor: classColor(character.className) }}
          />
          <View className="flex-1 px-4 py-3">
            <Text className="text-base font-semibold text-text">{character.name}</Text>
            <Text className="mt-0.5 text-xs text-text-dim">
              {character.realmName} · {character.region.toUpperCase()}
              {character.className ? ` · ${character.className}` : ''}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
