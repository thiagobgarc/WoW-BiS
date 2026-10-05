/**
 * Character-name input with suggestions.
 *
 * Laid out like RealmField, for the same reason: a phone has no room for a
 * popover, so matches render inline below the field and push the form
 * down. Tapping one opens that character directly; the realm field and the
 * search button stay for anyone who would rather type both.
 *
 * Matching ignores accents ("zoe" finds "Zóe"), which is the whole point:
 * Blizzard only finds a name spelled exactly, and most players can't type
 * their own name's accents on a phone keyboard.
 *
 * Recently viewed characters are not repeated here. The screen's own
 * "Recently viewed" list already narrows as you type, so a recent match
 * would appear twice.
 */
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import type { CharacterSuggestion, Region } from '@mythos/api-contract';
import { foldedMatchRange } from '@mythos/core/realm';
import { classColor } from '@mythos/core/utils';

import { TextField } from '@/components/TextField';
import { recentKey, type CharacterIdentity } from '@/features/roster/model/recentCharacters';
import { useCharacterSuggestions } from '../api/useCharacterSuggestions';

interface NameFieldProps {
  region: Region;
  value: string;
  onChange: (name: string) => void;
  onSelect: (character: CharacterSuggestion) => void;
  /** Characters already shown in the recents list, left out here. */
  exclude: CharacterIdentity[];
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  const range = foldedMatchRange(name, query);
  if (!range) return <Text className="text-base text-text">{name}</Text>;
  const [start, end] = range;
  return (
    <Text className="text-base text-text-muted">
      {name.slice(0, start)}
      <Text className="font-semibold text-text">{name.slice(start, end)}</Text>
      {name.slice(end)}
    </Text>
  );
}

export function NameField({ region, value, onChange, onSelect, exclude }: NameFieldProps) {
  const { characters, isSearching, isUnavailable } = useCharacterSuggestions(region, value);
  const excluded = new Set(exclude.map(recentKey));
  const shown = characters.filter((c) => !excluded.has(recentKey(c)));

  return (
    <View>
      <TextField
        label="Character"
        placeholder="Character name"
        value={value}
        onChangeText={onChange}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="next"
      />

      {shown.length > 0 ? (
        <View
          accessibilityRole="list"
          accessibilityLabel="Character suggestions"
          className="mt-1.5 overflow-hidden rounded-xl border border-border bg-panel"
        >
          {shown.map((character, index) => (
            <Pressable
              key={recentKey(character)}
              accessibilityRole="button"
              accessibilityLabel={`${character.name}, ${character.realmName}, ${character.region.toUpperCase()}${
                character.className ? `, ${character.className}` : ''
              }`}
              onPress={() => onSelect(character)}
              className={`min-h-[56px] flex-row items-center gap-3 px-3 py-2 active:bg-panel-hover ${
                index > 0 ? 'border-t border-border' : ''
              }`}
            >
              {/* The class color is decoration, as in the recents list: the
                  class itself is spelled out in the label and second line. */}
              <View
                className="h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 bg-bg"
                style={{ borderColor: classColor(character.className) }}
              >
                {character.avatarUrl ? (
                  <Image
                    source={{ uri: character.avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={120}
                  />
                ) : (
                  <Text className="text-xs font-semibold text-text-dim">{character.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View className="flex-1">
                <HighlightedName name={character.name} query={value} />
                <Text className="mt-0.5 text-xs text-text-dim" numberOfLines={1}>
                  {character.className ? `${character.className} · ` : ''}
                  {character.realmName}
                </Text>
              </View>
              <Text className="text-xs text-text-dim">{character.region.toUpperCase()}</Text>
            </Pressable>
          ))}
          <Text className="border-t border-border px-3 py-1.5 text-right text-[11px] text-text-faint">
            Suggestions from Raider.IO
          </Text>
        </View>
      ) : null}

      {/* Hints, never errors: the name can always be typed in full. */}
      {isSearching ? <Text className="mt-1.5 text-xs text-text-faint">Searching…</Text> : null}
      {isUnavailable && shown.length === 0 ? (
        <Text className="mt-1.5 text-xs text-text-faint">
          Name suggestions are offline. Type the full name and realm and search anyway.
        </Text>
      ) : null}
    </View>
  );
}
