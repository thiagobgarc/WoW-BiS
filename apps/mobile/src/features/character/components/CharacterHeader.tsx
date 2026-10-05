/**
 * Who this character is, above everything else on the screen.
 *
 * The web's header is a wide two-column card with a 112px render; at 390pt
 * it becomes a row with a smaller avatar and the three numbers wrapped
 * underneath. What survives verbatim is the accent treatment — the name
 * takes the class color, on a gradient of the same color, which is how a
 * WoW player identifies a character at a glance.
 *
 * The `metaTier` badge the web puts next to the name is deliberately absent
 * in v1: it is a rank within the tier list, and the tier list itself is the
 * `meta` surface deferred to 1.1 (architecture.md Section 8.10). A badge
 * reading "S" with nothing to tap through to is a riddle, not information.
 * It comes back with the Meta tab, behind the same `FEATURES.meta` flag.
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import type { DomainCharacter, EquipmentBySlot } from '@mythos/core/character';
import { classColor } from '@mythos/core/utils';

import { withAlpha } from '@/theme';
import { tierSetSummary } from '../model/tierSet';

interface CharacterHeaderProps {
  character: DomainCharacter;
  equipment: EquipmentBySlot;
  avatarUrl: string | null;
}

export function CharacterHeader({ character, equipment, avatarUrl }: CharacterHeaderProps) {
  const accent = classColor(character.className);
  const tier = tierSetSummary(equipment);

  return (
    <View
      className="flex-row gap-4 rounded-xl border p-4"
      style={{ backgroundColor: withAlpha(accent, 0.08), borderColor: withAlpha(accent, 0.15) }}
    >
      <View
        className="h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 bg-panel"
        style={{ borderColor: accent }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            // The render is the slowest image on the screen and the least
            // important; a placeholder that never resolves must not block.
            transition={150}
            accessibilityLabel={`${character.name}'s character render`}
          />
        ) : (
          <Text className="text-3xl">⚔️</Text>
        )}
      </View>

      <View className="min-w-0 flex-1">
        {/* accessibilityRole="header" is what puts this in TalkBack's and
            VoiceOver's heading rotor, which is how a screen-reader user
            skips the header to reach the gear. */}
        <Text accessibilityRole="header" className="text-2xl font-bold" style={{ color: accent }}>
          {character.name}
        </Text>
        <Text className="mt-0.5 text-sm text-text-muted">
          {character.specName ? `${character.specName} ` : ''}
          {character.className} · {character.realmName} ({character.region.toUpperCase()})
        </Text>
        {character.guildName ? (
          <Text className="mt-0.5 text-sm text-text-dim">{`<${character.guildName}>`}</Text>
        ) : null}

        <View className="mt-3 flex-row flex-wrap gap-2">
          <Stat label="Equipped" value={String(character.equippedItemLevel)} hint="Equipped item level" />
          <Stat label="Average" value={String(character.averageItemLevel)} hint="Average item level" />
          <Stat
            label="Tier"
            value={`${tier.owned}/${tier.total}`}
            hint="Tier set"
            // "4/5" is a good thing to read and a poor thing to hear.
            spokenValue={`${tier.owned} of ${tier.total} pieces`}
            // The bonus is the part a player acts on, so it is text, not a
            // color or a count they have to convert themselves.
            note={tier.label}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * `hint` is the stat's *spoken name* and nothing more — it is composed with
 * the value below, so a hint that already contains the value says it twice.
 * Phase 9's TalkBack pass caught exactly that: the tier tile announced
 * "Tier set: 4 of 5 pieces, 4pc active: 4/5, 4pc active".
 *
 * `spokenValue` exists for the case that caused it. A value can be worth
 * reading in a form that is poor to hear — "4/5" is the right glyph in a
 * 60pt-wide tile and the wrong sentence in a screen reader — so the tile
 * shows `value` and announces `spokenValue` when the two should differ.
 */
function Stat({
  label,
  value,
  hint,
  spokenValue,
  note,
}: {
  label: string;
  value: string;
  hint: string;
  spokenValue?: string;
  note?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${hint}: ${spokenValue ?? value}${note ? `, ${note}` : ''}`}
      className="rounded-lg bg-panel px-2.5 py-1.5"
    >
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-text-dim">{label}</Text>
      <Text className="text-sm font-semibold text-text">{value}</Text>
      {note ? <Text className="text-[10px] text-text-dim">{note}</Text> : null}
    </View>
  );
}
