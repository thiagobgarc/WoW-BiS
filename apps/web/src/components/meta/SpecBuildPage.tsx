import { useMemo, useState } from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { TalentTree } from '@/components/talents/TalentTree';
import { TierBadge } from '@/components/meta/TierBadge';
import { classColor } from '@mythos/core/utils';
import type { DomainTalentTree } from '@/lib/blizzard/domain';
import type { RecommendedContentType, RecommendedTalentBuild } from '@mythos/core/talents';
import type { MetaTier } from '@/lib/meta/types';

interface Props {
  className: string;
  specName: string;
  tree: DomainTalentTree;
  mythicPlusBuild: RecommendedTalentBuild | null;
  raidBuild: RecommendedTalentBuild | null;
  mythicPlusTier: MetaTier | null;
  raidTier: MetaTier | null;
}

interface Selection {
  rank: number;
  optionIndex: number;
}

function toMap(selections: { nodeId: number; rank: number; optionIndex: number }[]): Map<number, Selection> {
  return new Map(selections.map((s) => [s.nodeId, { rank: s.rank, optionIndex: s.optionIndex }]));
}

const CONTENT_TYPES: { value: RecommendedContentType; label: string }[] = [
  { value: 'mythic-plus', label: 'Mythic+' },
  { value: 'raid', label: 'Raid' },
];

function BuildPanel({ tree, build }: { tree: DomainTalentTree; build: RecommendedTalentBuild | null }) {
  const selections = useMemo(() => (build ? [...build.classSelections, ...build.specSelections] : []), [build]);
  const selectionMap = useMemo(() => toMap(selections), [selections]);

  if (!build) {
    return (
      <div className="rounded-xl border border-severity-upgrade/20 bg-severity-upgrade/5 p-6 text-center text-sm text-text-dim mt-4">
        No meta build has been seeded for this spec/content type yet.
      </div>
    );
  }

  return (
    <div className="mt-4">
      {build.notes && <div className="text-xs text-text-dim mb-4 italic">{build.notes}</div>}
      <div className="overflow-x-auto rounded-lg border border-white/8 bg-bg/60 p-4">
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-2 w-fit mx-auto">
          <TalentTree nodes={tree.classNodes} selections={selectionMap} title="Class Talents" />
          <TalentTree nodes={tree.specNodes} selections={selectionMap} title="Spec Talents" />
        </div>
      </div>
      <p className="text-[11px] text-text-dim mt-3">
        Hero talent recommendations aren't seeded yet — this covers class/spec picks only.
      </p>
    </div>
  );
}

export function SpecBuildPage({ className, specName, tree, mythicPlusBuild, raidBuild, mythicPlusTier, raidTier }: Props) {
  const accent = classColor(className);
  const builds: Record<RecommendedContentType, RecommendedTalentBuild | null> = { 'mythic-plus': mythicPlusBuild, raid: raidBuild };
  const [content, setContent] = useState<RecommendedContentType>(mythicPlusBuild ? 'mythic-plus' : 'raid');

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold" style={{ color: accent }}>
            {specName} {className}
          </h1>
          {mythicPlusTier && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              M+ <TierBadge tier={mythicPlusTier} />
            </span>
          )}
          {raidTier && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              Raid <TierBadge tier={raidTier} />
            </span>
          )}
        </div>
        <p className="text-sm text-text-dim mb-8">
          The current meta talent build for {specName} {className}.
        </p>

        <Tabs value={content} onValueChange={(v) => setContent(v as RecommendedContentType)}>
          <TabsList>
            {CONTENT_TYPES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={content} className="focus-visible:outline-none">
            <BuildPanel tree={tree} build={builds[content]} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
