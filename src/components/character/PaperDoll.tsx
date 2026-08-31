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

interface Props {
  equipment: EquipmentBySlot;
}

export function PaperDoll({ equipment }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {SLOT_ORDER.map((slot) => (
        <SlotTile key={slot} slot={slot} item={equipment[slot] ?? null} />
      ))}
    </div>
  );
}

export function PaperDollSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading character equipment">
      {SLOT_ORDER.map((slot) => (
        <div key={slot} className="rounded-lg border border-white/8 bg-panel p-3 flex items-center gap-3">
          <Skeleton className="w-12 h-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
