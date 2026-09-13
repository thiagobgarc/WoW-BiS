/**
 * What the character screen shows while the first request is in flight.
 *
 * It traces the real screen block for block — header, refresh bar, tabs,
 * paper doll, stats — so the arrival of the data changes the *contents* of
 * the layout and not the layout itself. That is the whole point of building
 * this rather than centering a spinner: the previous version pushed every
 * block down the page the moment the fetch landed.
 *
 * It reuses `paperDollColumns` rather than assuming two columns, so the
 * grid it draws is the grid that is about to appear, on a tablet as well as
 * a phone. Anything that would need real data to place — the class accent,
 * the item names, the stat priority — is simply absent; a skeleton that
 * guesses is a skeleton that lies.
 *
 * Only ever rendered for a character with no snapshot on the device.
 * Anything opened before comes back from the persisted cache instantly and
 * goes straight to the real screen with a staleness banner, so this is the
 * genuinely-nothing-to-show case (see `snapshot.ts`).
 */
import { useWindowDimensions, View } from 'react-native';

import { Skeleton, SkeletonScreen } from '@/components/Skeleton';
import { PAPER_DOLL_SLOTS } from '../model/slots';
import { paperDollColumns } from './PaperDoll';

interface CharacterSkeletonProps {
  /** The name from the route, which is all that is known at this point. */
  name: string | undefined;
}

export function CharacterSkeleton({ name }: CharacterSkeletonProps) {
  const { width, fontScale } = useWindowDimensions();
  const columns = paperDollColumns(width, fontScale);

  return (
    <SkeletonScreen label={name ? `Loading ${name}` : 'Loading character'}>
      <View className="gap-4 pb-8 pt-2">
        {/* Header: avatar, name, the spec/ilvl line. */}
        <View className="flex-row items-center gap-3 rounded-xl border border-border bg-panel p-4">
          <Skeleton width={64} height={64} radius={999} />
          <View className="flex-1 gap-2">
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>

        {/* Refresh bar. */}
        <Skeleton height={36} radius={10} />

        {/* Segmented control — two segments in v1, three at 1.1, and the
            skeleton should not claim a tab that will not be there. */}
        <Skeleton height={40} radius={10} />

        {/* Paper doll. The tile height matches SlotTile's min-h-[88px]. */}
        <View className="-mr-2 flex-row flex-wrap">
          {PAPER_DOLL_SLOTS.map((slot) => (
            <View key={slot} style={{ width: `${100 / columns}%` }} className="pb-2 pr-2">
              <Skeleton height={88} radius={12} />
            </View>
          ))}
        </View>

        {/* Stats. */}
        <View className="gap-3 rounded-xl border border-border bg-panel p-4">
          <Skeleton width="35%" height={14} />
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} height={10} radius={999} />
          ))}
        </View>
      </View>
    </SkeletonScreen>
  );
}
