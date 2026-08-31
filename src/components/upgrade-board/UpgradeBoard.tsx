import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { compareGear } from '@/lib/bis/compareGear';
import { deriveActionGroups } from '@/lib/bis/deriveActionGroups';
import { CONTENT_TYPES, type BisEntry, type ContentType } from '@/lib/bis/types';
import type { EquipmentBySlot } from '@/lib/blizzard/domain';
import { CompletionMeter } from './CompletionMeter';
import { ComparisonRow } from './ComparisonRow';
import { ActionPanels } from './ActionPanels';
import { QuickWinsPanel } from './QuickWinsPanel';

const TAB_LABEL: Record<ContentType, string> = { raid: 'Raid', 'mythic-plus': 'Mythic+', pvp: 'PvP' };

interface Props {
  equipment: EquipmentBySlot;
  bisEntries: BisEntry[];
  seeded: boolean;
}

export function UpgradeBoard({ equipment, bisEntries, seeded }: Props) {
  const [contentType, setContentType] = useState<ContentType>('raid');

  const result = useMemo(() => compareGear(equipment, bisEntries, contentType), [equipment, bisEntries, contentType]);
  const groups = useMemo(() => deriveActionGroups(result.rows, equipment), [result.rows, equipment]);

  if (!seeded) {
    return (
      <div className="rounded-xl border border-severity-upgrade/20 bg-severity-upgrade/5 p-6 text-center text-sm text-text-muted">
        No BiS data has been seeded for this class/spec yet. See the README for how to add a spec's BiS list.
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Upgrade Board</h2>

      <div className="mb-6">
        <CompletionMeter
          bisSlotsCount={result.bisSlotsCount}
          totalSlots={result.totalSlots}
          theoreticalMaxIlvl={result.theoreticalMaxIlvl}
          currentIlvl={result.currentIlvl}
        />
      </div>

      <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
        <TabsList>
          {CONTENT_TYPES.map((ct) => (
            <TabsTrigger key={ct} value={ct}>
              {TAB_LABEL[ct]}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONTENT_TYPES.map((ct) => (
          <TabsContent key={ct} value={ct} className="focus-visible:outline-none">
            {ct === contentType && (
              <>
                <div className="flex flex-col gap-3 mb-8">
                  {result.rows.map((row) => (
                    <ComparisonRow key={`${row.bisSlot}-${row.physicalSlot}`} row={row} />
                  ))}
                </div>

                <QuickWinsPanel quickWins={groups.quickWins} />
                <div className="mt-5">
                  <ActionPanels groups={groups} />
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
