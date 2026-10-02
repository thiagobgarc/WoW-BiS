/**
 * The differences, grouped by kind, worst first.
 *
 * Each group is a `CollapsibleSection` with its count in the header, so the
 * shape of the answer — "three not taken, one different choice" — survives
 * everything being folded. The two groups that are actually actionable
 * (`missing`, `different-choice`) open by default; `lower-rank` and `extra`
 * are context and start folded.
 *
 * A build with no differences at all renders the congratulation, not an
 * empty screen. That state is common and correct: the recommended builds
 * are seeded from the same sources most players copy.
 */
import { Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { colors } from '@/theme';

import {
  DIFF_KIND_STYLE,
  diffRowAccessibilityLabel,
  diffRowDetail,
  treeLabel,
} from '../model/diffKind';
import { DIFF_KIND_ORDER, rowsOfKind, type TalentDiffKind, type TalentDiffRow } from '../model/talentDiff';
import { TalentIcon } from './TalentIcon';

/** The two worth opening unprompted; the other two are context. */
const OPEN_BY_DEFAULT: readonly TalentDiffKind[] = ['missing', 'different-choice'];

function DiffRow({ row }: { row: TalentDiffRow }) {
  const style = DIFF_KIND_STYLE[row.kind];
  const detail = diffRowDetail(row);

  return (
    <View
      accessible
      accessibilityLabel={diffRowAccessibilityLabel(row)}
      className="flex-row items-center gap-3"
    >
      <TalentIcon
        iconUrl={row.iconUrl}
        // A talent that isn't taken is shown as not taken, the same way the
        // web greys an unselected node rather than hiding it.
        dimmed={row.kind === 'missing'}
        {...(row.kind === 'extra' && row.maxRank && row.maxRank > 1
          ? { rank: row.currentRank }
          : {})}
      />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">{row.name}</Text>
        <Text className="mt-0.5 text-xs text-text-dim">
          {treeLabel(row.tree)}
          {detail ? ` · ${detail}` : ''}
        </Text>
      </View>
      <Icon name={style.icon} size={16} color={style.color} />
    </View>
  );
}

interface TalentDiffListProps {
  rows: TalentDiffRow[];
  openKinds: ReadonlySet<TalentDiffKind>;
  onToggleKind: (kind: TalentDiffKind) => void;
}

export function TalentDiffList({ rows, openKinds, onToggleKind }: TalentDiffListProps) {
  if (rows.length === 0) {
    return (
      <View
        accessible
        accessibilityLabel="This build matches the recommended one exactly."
        className="flex-row items-center gap-2 rounded-xl border border-severity-bis/30 bg-severity-bis/10 p-4"
      >
        <Icon name="checkmark-circle" size={16} color={colors.severity.bis} />
        <Text className="flex-1 text-xs leading-5 text-text-muted">
          This build matches the recommended one exactly — every pick, every point.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {DIFF_KIND_ORDER.map((kind) => {
        const ofKind = rowsOfKind(rows, kind);
        if (ofKind.length === 0) return null;
        const style = DIFF_KIND_STYLE[kind];

        return (
          <CollapsibleSection
            key={kind}
            title={style.title}
            count={ofKind.length}
            icon={style.icon}
            expanded={openKinds.has(kind)}
            onToggle={() => onToggleKind(kind)}
          >
            <Text className="mb-3 text-xs text-text-dim">{style.blurb}</Text>
            <View className="gap-3">
              {ofKind.map((row) => (
                <DiffRow key={`${kind}-${row.nodeId}`} row={row} />
              ))}
            </View>
          </CollapsibleSection>
        );
      })}
    </View>
  );
}

export { OPEN_BY_DEFAULT };
