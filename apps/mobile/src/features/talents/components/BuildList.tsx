/**
 * Everything this character has actually taken, grouped Class / Hero / Spec
 * exactly as the web draws its three trees.
 *
 * **This is the phone's answer to the talent tree, and it is a replacement
 * rather than a fallback.** `mobile-ux.md` puts the pannable, pinch-zoom
 * tree out of scope even at 1.1, and the reason holds up on inspection: a
 * class tree is roughly 20x10 cells of 40px icons, so on a phone it is
 * either unreadably small or a two-axis pan over something the player is
 * only reading, not editing — the game itself is the only place a build can
 * be changed. A list says the same thing, scrolls on one axis, and can be
 * read by a screen reader.
 *
 * Order within a group is tree order, which is roughly top-to-bottom in the
 * real tree, so a player scanning for a talent looks where they are used to
 * looking.
 */
import { Text, View } from 'react-native';

import type { BuildGroup } from '../model/talentDiff';
import { TalentIcon } from './TalentIcon';

export function BuildList({ groups }: { groups: BuildGroup[] }) {
  if (groups.length === 0) {
    return (
      <View
        accessible
        accessibilityLabel="No talents are selected on this character."
        className="rounded-xl border border-border bg-panel p-4"
      >
        <Text className="text-xs leading-5 text-text-muted">
          No talents are selected on this character. Blizzard reports an empty loadout for
          characters who have not chosen one for this spec yet.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {groups.map((group) => (
        <View key={group.id} className="rounded-xl border border-border bg-panel p-4">
          <Text accessibilityRole="header" className="text-sm font-semibold text-text">
            {group.title}
          </Text>
          <Text className="mt-0.5 text-xs text-text-dim">
            {group.talents.length} {group.talents.length === 1 ? 'talent' : 'talents'}
          </Text>

          <View className="mt-3 gap-3">
            {group.talents.map((talent) => (
              <View
                key={talent.nodeId}
                accessible
                accessibilityLabel={[
                  `${talent.name}.`,
                  talent.maxRank > 1 ? `Rank ${talent.rank} of ${talent.maxRank}.` : null,
                  talent.choiceOf ? `Choice of ${talent.choiceOf.join(' or ')}.` : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                className="flex-row items-center gap-3"
              >
                <TalentIcon
                  iconUrl={talent.iconUrl}
                  {...(talent.maxRank > 1 ? { rank: talent.rank } : {})}
                />
                <View className="flex-1">
                  <Text className="text-sm text-text">{talent.name}</Text>
                  {talent.choiceOf ? (
                    <Text className="mt-0.5 text-xs text-text-dim">
                      Choice of {talent.choiceOf.join(' / ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
