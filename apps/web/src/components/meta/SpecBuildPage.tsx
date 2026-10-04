import { useMemo, useState } from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { TalentTree, TalentTreePanel } from '@/components/talents/TalentTree';
import { TalentLegend } from '@/components/talents/TalentTreeSection';
import { TierBadge } from '@/components/meta/TierBadge';
import { classColor } from '@mythos/core/utils';
import type { DomainTalentTree } from '@/lib/blizzard/domain';
import type { RecommendedContentType, RecommendedTalentBuild } from '@mythos/core/talents';
import type { MetaTier } from '@/lib/meta/types';
import { bisPath } from '@/lib/meta/specLinks';

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
      <div className="mt-4 border-l-2 border-severity-upgrade pl-5 text-sm text-text-dim">
        No meta build has been seeded for this spec/content type yet.
      </div>
    );
  }

  return (
    <div className="mt-4">
      {build.notes && <div className="text-xs text-text-dim mb-4 italic">{build.notes}</div>}
      <TalentTreePanel>
        <TalentTree nodes={tree.classNodes} selections={selectionMap} title="Class" />
        <TalentTree nodes={tree.specNodes} selections={selectionMap} title="Spec" />
      </TalentTreePanel>
      <TalentLegend showMissing={false} />
      <p className="label mt-3">
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
      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="my-14 border-l-[3px] pl-6 sm:pl-10" style={{ borderColor: accent }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="display text-[clamp(2rem,5.5vw,3.25rem)]" style={{ color: accent }}>
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
        <p className="mt-4 max-w-[58ch] text-base text-text-muted">
          The current meta talent build for {specName} {className}.
        </p>
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          <a href={bisPath(className, specName)} className="link">
            {specName} {className} BiS gear
          </a>
          <a href="/meta" className="link">
            Spec tier list
          </a>
        </p>
        </div>

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
