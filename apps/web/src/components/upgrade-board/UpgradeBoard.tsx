import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { compareGear, deriveActionGroups, CONTENT_TYPES, type BisEntry, type ContentType } from '@mythos/core/bis';
import { seasonConfig } from '@/lib/season/seasonConfig';
import type { EquipmentBySlot } from '@/lib/blizzard/domain';
import { CompletionMeter } from './CompletionMeter';
import { ComparisonRow } from './ComparisonRow';
import { ActionPanels } from './ActionPanels';
import { QuickWinsPanel } from './QuickWinsPanel';

const TAB_LABEL: Record<ContentType, string> = { raid: 'Raid', 'mythic-plus': 'Mythic+', pvp: 'PvP' };

interface Props {
  equipment: EquipmentBySlot;
  bisEntries: BisEntry[];
  /** Icon url per BiS item id; items without one show the placeholder. */
  bisIcons: Record<number, string>;
  seeded: boolean;
}

export function UpgradeBoard({ equipment, bisEntries, bisIcons, seeded }: Props) {
  const [contentType, setContentType] = useState<ContentType>('raid');

  const result = useMemo(() => compareGear(equipment, bisEntries, contentType), [equipment, bisEntries, contentType]);
  const groups = useMemo(
    () => deriveActionGroups(result.rows, equipment, seasonConfig),
    [result.rows, equipment],
  );

  if (!seeded) {
    return (
      <div className="border-l-2 border-severity-upgrade pl-5">
        <h2 className="mb-1 text-base font-semibold">What to upgrade</h2>
        <p className="text-sm text-text-muted">
          No best-in-slot list has been seeded for this class and spec yet. The README covers how to add one.
        </p>
      </div>
    );
  }

  return (
    <div>
      <CompletionMeter
        bisSlotsCount={result.bisSlotsCount}
        totalSlots={result.totalSlots}
        theoreticalMaxIlvl={result.theoreticalMaxIlvl}
        currentIlvl={result.currentIlvl}
        contentType={contentType}
      />

      <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
        <div className="mt-12 flex flex-wrap items-baseline justify-between gap-x-6">
          <h2 className="text-base font-semibold">What to upgrade</h2>
          <TabsList className="border-none">
            {CONTENT_TYPES.map((ct) => (
              <TabsTrigger key={ct} value={ct}>
                {TAB_LABEL[ct]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {CONTENT_TYPES.map((ct) => (
          <TabsContent key={ct} value={ct} className="focus-visible:outline-none">
            {ct === contentType && (
              <>
                {/* Column headings for the board: what you have on the left,
                    what it gains you on the right, named rather than implied. */}
                <div className="flex items-baseline justify-between border-y border-rule-strong py-2">
                  <span className="label">Equipped, and what replaces it</span>
                  {/* A column heading only where there is a column: below md
                      the delta stacks under the row instead. */}
                  <span className="label hidden md:inline">Gain</span>
                </div>

                <div>
                  {result.rows.map((row) => (
                    <ComparisonRow
                      key={`${row.bisSlot}-${row.physicalSlot}`}
                      row={row}
                      targetIconUrl={row.target ? (bisIcons[row.target.itemId] ?? null) : null}
                    />
                  ))}
                </div>

                <div className="mt-12 space-y-12">
                  <QuickWinsPanel quickWins={groups.quickWins} />
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
