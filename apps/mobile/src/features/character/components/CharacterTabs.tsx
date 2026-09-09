/**
 * Gear | Progression, the character screen's two v1 destinations.
 *
 * A segmented control rather than a navigator, because both tabs read from
 * the same already-fetched payload (api-contract.md's "one round trip") and
 * neither has a route, a URL or a back-stack entry of its own. Switching is
 * a `useState` on the screen — no navigation, no remount, and therefore no
 * spinner, which is the property mobile-ux.md asks for by name.
 *
 * A third **Talents** tab lands at 1.1 (`FEATURES.talents`). Adding it is a
 * new entry in the array a caller passes, not a restructure — which is the
 * whole reason this takes its tabs as data.
 *
 * There is no transition animation to gate for reduce-motion: the content
 * swaps instantly. That is a decision, not an omission — a 60ms cross-fade
 * between two full screens of text buys nothing and is one more thing to
 * turn off.
 */
import { Pressable, Text, View } from 'react-native';

export interface CharacterTab<Id extends string> {
  id: Id;
  label: string;
}

interface CharacterTabsProps<Id extends string> {
  tabs: readonly CharacterTab<Id>[];
  active: Id;
  onChange: (id: Id) => void;
}

export function CharacterTabs<Id extends string>({ tabs, active, onChange }: CharacterTabsProps<Id>) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row gap-1 rounded-xl border border-border bg-panel p-1"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            // `selected` is what VoiceOver reads; `checked` is what TalkBack
            // reads. Both, or half the users hear nothing about which is on.
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.id)}
            className={`min-h-11 flex-1 items-center justify-center rounded-lg ${
              selected ? 'bg-accent-soft' : ''
            }`}
          >
            <Text className={`text-sm font-semibold ${selected ? 'text-text' : 'text-text-dim'}`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
