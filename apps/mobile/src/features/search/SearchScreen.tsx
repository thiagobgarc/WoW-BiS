/**
 * Search — the app's home, and where a cold launch lands.
 *
 * mobile-ux.md maps the web's `SearchForm` + `RealmCombobox` here: a
 * full-screen form rather than an inline one, region as a segmented control,
 * and the recent-character list promoted from a row of chips to the screen's
 * second half. It is the primary destination, so it gets the whole screen.
 *
 * **Everything on this screen works with no server.** That is Phase 5's exit
 * criterion, and it drove three choices: the recents come from MMKV rather
 * than the network, the search button is never gated on autocomplete having
 * loaded, and the season line simply disappears when /v1/meta is unreachable
 * instead of becoming an error. The only degraded thing offline is realm
 * autocomplete, which says so in one line of hint text and blocks nothing.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { CharacterSuggestion } from '@mythos/api-contract';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { apiBaseUrl } from '@/lib/api';
import { useMeta } from '@/features/meta/api/useMeta';
import { matchRecent, type RecentCharacter } from '@/features/roster/model/recentCharacters';
import { useRecentCharacters, useRegion, useSetRegion } from '@/features/roster/store';
import { NameField } from './components/NameField';
import { RealmField } from './components/RealmField';
import { RecentCharacterList } from './components/RecentCharacterList';
import { RegionPicker } from './components/RegionPicker';
import { canSearch, characterRoute } from './model/searchForm';

export default function SearchScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [realm, setRealm] = useState('');

  // Region and the roster live in the store, not in useState: the picker's
  // choice has to survive this screen unmounting when a character is pushed.
  const region = useRegion();
  const setRegion = useSetRegion();
  const recent = useRecentCharacters();

  /**
   * The season the BiS data describes. Purely informational here — the
   * screen is fully usable while this is pending or failed, so it has no
   * loading or error state of its own, it is simply absent until it
   * resolves. The upgrade board shares the query; see useMeta.
   */
  const meta = useMeta();

  const matches = matchRecent(recent, name);
  const submittable = canSearch(name, realm);

  function search() {
    if (!submittable) return;
    router.push(characterRoute(region, realm, name));
  }

  function openRecent(character: RecentCharacter) {
    router.push(characterRoute(character.region, character.realmSlug, character.name));
  }

  function openSuggestion(character: CharacterSuggestion) {
    router.push(characterRoute(character.region, character.realmSlug, character.name));
  }

  return (
    <Screen edges={{ bottom: false }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          // Without this, the first tap on a realm suggestion only dismisses
          // the keyboard and the second one selects — the classic
          // autocomplete-inside-a-ScrollView bug.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text className="mt-4 text-3xl font-bold text-text">Mythos</Text>
          {meta.data ? (
            <Text className="mt-1 text-sm text-text-muted">
              {meta.data.season.displayName} · {meta.data.season.raidName}
            </Text>
          ) : (
            <Text className="mt-1 text-sm text-text-muted">
              Best-in-slot gear planning for World of Warcraft.
            </Text>
          )}

          <View className="mt-6 gap-4">
            <NameField
              region={region}
              value={name}
              onChange={setName}
              onSelect={openSuggestion}
              exclude={matches}
            />
            <RegionPicker value={region} onChange={setRegion} />
            <RealmField
              region={region}
              value={realm}
              onChange={setRealm}
              onSubmitEditing={search}
            />
            <Button label="Search" onPress={search} disabled={!submittable} />
          </View>

          <View className="mt-8 mb-6">
            <Text className="text-xs font-semibold uppercase tracking-widest text-text-faint">
              Recently viewed
            </Text>
            <RecentCharacterList
              characters={matches}
              onSelect={openRecent}
              filtered={recent.length > 0 && matches.length === 0}
            />
          </View>

          {/* Which host a build resolved to is the single most useful thing
              to see when a dev build can't reach the API. Never shipped. */}
          {__DEV__ ? <Text className="mb-4 text-xs text-text-faint">{apiBaseUrl}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
