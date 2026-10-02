/**
 * Region as a segmented control, per mobile-ux.md's mapping of the web's
 * `<select>`.
 *
 * Only four of the contract's five regions appear. `cn` is a valid region in
 * `RegionSchema` because the schema describes what the *API* accepts, but
 * Blizzard serves mainland China from a separate API host with separate
 * credentials that apps/web has never been configured for — offering it here
 * would produce a lookup that cannot succeed. The contract stays permissive;
 * the picker stays honest.
 *
 * `radiogroup`/`radio` rather than `button`, because that is what a
 * one-of-four choice is, and it is what makes TalkBack and VoiceOver
 * announce "2 of 4" instead of four unrelated buttons.
 */
import { Pressable, Text, View } from 'react-native';
import type { Region } from '@mythos/api-contract';

/** The regions apps/web's SearchForm offers, in its order. */
export const SEARCHABLE_REGIONS = ['us', 'eu', 'kr', 'tw'] as const satisfies readonly Region[];

interface RegionPickerProps {
  value: Region;
  onChange: (region: Region) => void;
}

export function RegionPicker({ value, onChange }: RegionPickerProps) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-faint">
        Region
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Region"
        className="flex-row gap-1 rounded-xl border border-border bg-panel p-1"
      >
        {SEARCHABLE_REGIONS.map((region) => {
          const selected = region === value;
          return (
            <Pressable
              key={region}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={region.toUpperCase()}
              onPress={() => onChange(region)}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${
                selected ? 'bg-accent-soft' : ''
              }`}
            >
              <Text
                className={`text-sm font-semibold ${selected ? 'text-text' : 'text-text-dim'}`}
              >
                {region.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
