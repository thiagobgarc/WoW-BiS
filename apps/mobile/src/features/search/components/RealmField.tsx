/**
 * Realm input with autocomplete.
 *
 * The web renders an absolutely-positioned popover over the page; a phone
 * has no room for one, so suggestions render inline below the field and push
 * the rest of the form down. That is the mobile-ux.md mapping ("native
 * keyboard-aware list") and it removes the whole click-outside-to-dismiss
 * problem the web component has to solve.
 *
 * A plain mapped list, not FlashList: the endpoint caps at 20 rows, and
 * FlashList inside the screen's ScrollView would nest two virtualised lists
 * — the arrangement RN warns about — for twenty items.
 */
import { Pressable, Text, View } from 'react-native';
import type { Region } from '@mythos/api-contract';

import { TextField } from '@/components/TextField';
import { useRealmSuggestions } from '../api/useRealmSuggestions';

interface RealmFieldProps {
  region: Region;
  value: string;
  onChange: (realm: string) => void;
  onSubmitEditing?: () => void;
}

export function RealmField({ region, value, onChange, onSubmitEditing }: RealmFieldProps) {
  const { realms, isMock, isUnavailable } = useRealmSuggestions(region, value);

  // Once the field holds exactly what was picked, the list has nothing left
  // to offer — hiding it then is what makes selecting a suggestion feel like
  // it closed the popover, without tracking an `open` flag.
  const exactMatch = realms.length === 1 && realms[0]?.toLowerCase() === value.trim().toLowerCase();
  const showSuggestions = value.trim().length > 0 && realms.length > 0 && !exactMatch;

  return (
    <View>
      <TextField
        label="Realm"
        placeholder="Realm"
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="search"
      />

      {showSuggestions ? (
        <View
          accessibilityRole="list"
          className="mt-1.5 overflow-hidden rounded-xl border border-border bg-panel"
        >
          {realms.map((realm, index) => (
            <Pressable
              key={realm}
              accessibilityRole="button"
              accessibilityLabel={`Realm ${realm}`}
              onPress={() => onChange(realm)}
              className={`min-h-[44px] justify-center px-4 py-2 active:bg-panel-hover ${
                index > 0 ? 'border-t border-border' : ''
              }`}
            >
              <Text className="text-sm text-text-muted">{realm}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/*
        Both of these are hints, not errors. Neither blocks the search button
        — a realm typed by hand works whether or not the suggestion list did.
      */}
      {isUnavailable ? (
        <Text className="mt-1.5 text-xs text-text-faint">
          Realm suggestions are offline. Type the realm name and search anyway.
        </Text>
      ) : null}

      {isMock ? (
        <Text className="mt-1.5 text-xs text-severity-close">
          Showing sample realms — the server has no Blizzard credentials configured.
        </Text>
      ) : null}
    </View>
  );
}
