/**
 * The comparison rows re-grouped by what you would actually go and do:
 * which bosses, which dungeons, what to craft, what to run through the
 * catalyst.
 *
 * `deriveActionGroups` does all of it; this renders four collapsible
 * sections over its output and decides nothing. Sections with no entries
 * are absent rather than empty — a spec whose list is all dungeon drops
 * should not be told twice that it has no craft targets.
 *
 * Collapsed by default, unlike the quick wins above the rows. They come
 * after sixteen comparison rows on a phone, and their headers double as a
 * summary — "Bosses to prioritise, 3" is most of the answer, and the slot
 * names inside are the detail you open when you have picked one.
 */
import { Text, View } from 'react-native';
import type { ActionGroups, ComparisonRow } from '@mythos/core/bis';

import { Icon } from '@/components/Icon';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { colors } from '@/theme';

import { unroutedMessage, unroutedUpgradeSlots } from '../model/actionCoverage';

/** Stable ids so the board can track which sections are open. */
export type ActionPanelId = 'bosses' | 'dungeons' | 'craft' | 'catalyst';

interface ActionRow {
  key: string;
  /** The short, bold half — a count, or the slot the item belongs in. */
  lead: string;
  detail: string;
}

function Rows({ rows }: { rows: ActionRow[] }) {
  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row.key} accessible accessibilityLabel={`${row.lead}: ${row.detail}`}>
          <Text className="text-xs font-semibold text-text">{row.lead}</Text>
          <Text className="mt-0.5 text-xs leading-5 text-text-muted">{row.detail}</Text>
        </View>
      ))}
    </View>
  );
}

function upgradeCount(slots: string[]): string {
  return `${slots.length} upgrade${slots.length > 1 ? 's' : ''}`;
}

interface ActionPanelsProps {
  groups: ActionGroups;
  /**
   * The same rows `groups` was derived from. Needed because an empty group
   * set means two different things — nothing left to chase, or nothing these
   * panels know how to route you to — and only the rows tell them apart.
   */
  rows: ComparisonRow[];
  isExpanded: (id: ActionPanelId) => boolean;
  onToggle: (id: ActionPanelId) => void;
}

/** The quiet line under the panels, and the whole body of the empty one. */
function Unrouted({ message }: { message: string }) {
  return (
    <View
      accessible
      accessibilityLabel={message}
      className="flex-row items-start gap-2 rounded-xl border border-border bg-panel p-4"
    >
      <Icon name="help-circle" size={16} color={colors['text-dim']} style={{ marginTop: 2 }} />
      <Text className="flex-1 text-xs leading-5 text-text-dim">{message}</Text>
    </View>
  );
}

export function ActionPanels({ groups, rows, isExpanded, onToggle }: ActionPanelsProps) {
  const { raidTargets, dungeonTargets, craftTargets, catalystTargets } = groups;
  const total =
    raidTargets.length + dungeonTargets.length + craftTargets.length + catalystTargets.length;
  const unrouted = unroutedMessage(unroutedUpgradeSlots(rows));

  // No panels *and* nothing unrouted is the only case where this content
  // type is genuinely finished. With upgrades the panels cannot route,
  // saying so is the honest empty state — see model/actionCoverage.ts.
  if (total === 0 && unrouted) {
    return <Unrouted message={unrouted} />;
  }

  if (total === 0) {
    return (
      <View
        accessible
        accessibilityLabel="No upgrades left for this content type — every slot with a target is already best in slot."
        className="flex-row items-center gap-2 rounded-xl border border-severity-bis/30 bg-severity-bis/10 p-4"
      >
        <Icon name="trophy" size={16} color={colors.severity.bis} />
        <Text className="flex-1 text-xs leading-5 text-text-muted">
          Nothing left to chase here — every slot with a target is already best in slot.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {raidTargets.length > 0 ? (
        <CollapsibleSection
          title="Bosses to prioritise"
          count={raidTargets.length}
          icon="location"
          expanded={isExpanded('bosses')}
          onToggle={() => onToggle('bosses')}
        >
          <Rows
            rows={raidTargets.map((target) => ({
              key: `${target.boss}-${target.instance}-${target.difficulty ?? ''}`,
              lead: upgradeCount(target.slots),
              detail: `${target.boss}${target.instance ? ` · ${target.instance}` : ''} (${target.slots.join(', ')})`,
            }))}
          />
        </CollapsibleSection>
      ) : null}

      {dungeonTargets.length > 0 ? (
        <CollapsibleSection
          title="Dungeons to farm"
          count={dungeonTargets.length}
          icon="skull"
          expanded={isExpanded('dungeons')}
          onToggle={() => onToggle('dungeons')}
        >
          <Rows
            rows={dungeonTargets.map((target) => ({
              key: target.dungeon,
              lead: upgradeCount(target.slots),
              detail: `${target.dungeon} (${target.slots.join(', ')})`,
            }))}
          />
        </CollapsibleSection>
      ) : null}

      {craftTargets.length > 0 ? (
        <CollapsibleSection
          title="Craft these"
          count={craftTargets.length}
          icon="hammer"
          expanded={isExpanded('craft')}
          onToggle={() => onToggle('craft')}
        >
          <Rows
            rows={craftTargets.map((target) => ({
              key: target.slot,
              lead: target.craftQuality ? `${target.slot} · Q${target.craftQuality}` : target.slot,
              detail: target.itemName,
            }))}
          />
        </CollapsibleSection>
      ) : null}

      {catalystTargets.length > 0 ? (
        <CollapsibleSection
          title="Catalyst these"
          count={catalystTargets.length}
          icon="cog"
          expanded={isExpanded('catalyst')}
          onToggle={() => onToggle('catalyst')}
        >
          <Rows
            rows={catalystTargets.map((target) => ({
              key: target.slot,
              lead: target.slot,
              detail: target.itemName,
            }))}
          />
        </CollapsibleSection>
      ) : null}

      {/* Panels were rendered, but they do not cover everything. Without
          this the omission is invisible: four sections that look complete. */}
      {unrouted ? <Unrouted message={unrouted} /> : null}
    </View>
  );
}
