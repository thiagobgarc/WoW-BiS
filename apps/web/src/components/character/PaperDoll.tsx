import type { EquipmentBySlot, EquipmentSlot } from '@/lib/blizzard/domain';
import { SlotTile } from './SlotTile';
import { Skeleton } from '@/components/ui/Skeleton';

const SLOT_ORDER: EquipmentSlot[] = [
  'head',
  'neck',
  'shoulder',
  'chest',
  'waist',
  'legs',
  'feet',
  'wrist',
  'hands',
  'finger_1',
  'finger_2',
  'trinket_1',
  'trinket_2',
  'back',
  'main_hand',
  'off_hand',
];

/**
 * Split into two groups so that each column carries its own "Item level"
 * header directly above its own figures. A single header over a two-column
 * grid would sit above only the first column's numbers.
 */
const COLUMNS: EquipmentSlot[][] = [SLOT_ORDER.slice(0, 8), SLOT_ORDER.slice(8)];

function ColumnHeader({ first }: { first: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-rule-strong pb-2.5">
      {first ? (
        <h2 className="text-sm font-semibold">Equipped</h2>
      ) : (
        <h2 className="text-sm font-semibold">
          <span className="sr-only">Equipped, continued</span>
        </h2>
      )}
      <span className="label">Item level</span>
    </div>
  );
}

interface Props {
  equipment: EquipmentBySlot;
}

export function PaperDoll({ equipment }: Props) {
  return (
    <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
      {COLUMNS.map((column, i) => (
        <div key={i}>
          <ColumnHeader first={i === 0} />
          {column.map((slot) => (
            <SlotTile key={slot} slot={slot} item={equipment[slot] ?? null} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PaperDollSkeleton() {
  return (
    <div className="grid gap-x-12 gap-y-8 md:grid-cols-2" aria-busy="true" aria-label="Loading character equipment">
      {COLUMNS.map((column, i) => (
        <div key={i}>
          <ColumnHeader first={i === 0} />
          {column.map((slot) => (
            <div key={slot} className="grid min-h-[60px] grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-rule py-3">
              <Skeleton className="h-11 w-11" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-1/4" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
