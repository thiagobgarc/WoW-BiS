import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { diffTalents } from '@mythos/core/talents';
import { TalentTree, TalentTreePanel } from './TalentTree';
import type { NodeSelection } from './TalentNode';
import type { DomainHeroTree, DomainTalentTree, TalentSelection } from '@/lib/blizzard/domain';
import type { RecommendedTalentBuild } from '@mythos/core/talents';

interface Props {
  tree: DomainTalentTree;
  current: TalentSelection[] | null;
  heroTree: DomainHeroTree | null;
  heroSelections: TalentSelection[] | null;
  recommended: RecommendedTalentBuild | null;
}

function toMap(selections: { nodeId: number; rank: number; optionIndex: number }[]): Map<number, NodeSelection> {
  return new Map(selections.map((s) => [s.nodeId, { rank: s.rank, optionIndex: s.optionIndex }]));
}

function LegendShape({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`inline-block h-3 w-3 border-2 border-text-dim ${className ?? ''}`} style={style} aria-hidden="true" />;
}

export function TalentLegend({ showMissing }: { showMissing: boolean }) {
  return (
    <ul className="label mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
      <li className="flex items-center gap-1.5">
        <LegendShape className="rounded-[2px]" /> Active
      </li>
      <li className="flex items-center gap-1.5">
        <LegendShape className="rounded-full" /> Passive
      </li>
      <li className="flex items-center gap-1.5">
        {/* A rotated square reads as the choice node's octagon at this size. */}
        <LegendShape className="rotate-45 rounded-[1px]" style={{ width: 10, height: 10 }} /> Choice
      </li>
      {showMissing && (
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-severity-upgrade" aria-hidden="true" /> Missing from your
          build
        </li>
      )}
    </ul>
  );
}

export function TalentTreeSection({ tree, current, heroTree, heroSelections, recommended }: Props) {
  const currentMap = useMemo(() => toMap(current ?? []), [current]);
  const heroMap = useMemo(() => toMap(heroSelections ?? []), [heroSelections]);
  const recommendedSelections = useMemo(
    () => (recommended ? [...recommended.classSelections, ...recommended.specSelections] : []),
    [recommended],
  );
  const recommendedMap = useMemo(() => toMap(recommendedSelections), [recommendedSelections]);
  const matchSummary = useMemo(
    () => (recommended ? diffTalents(current, recommendedSelections) : null),
    [current, recommended, recommendedSelections],
  );
  const missing = useMemo(() => new Set(matchSummary?.missingNodeIds ?? []), [matchSummary]);

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">Talents</h2>
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current build</TabsTrigger>
          <TabsTrigger value="recommended">Recommended (Mythic+)</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="focus-visible:outline-none">
          {current === null && !heroTree && (
            <div className="mb-4 border-l-2 border-severity-upgrade pl-4 text-xs text-severity-upgrade">
              No talents selected on this character yet.
            </div>
          )}
          <TalentTreePanel>
            <TalentTree nodes={tree.classNodes} selections={currentMap} title="Class" />
            {heroTree && <TalentTree nodes={heroTree.nodes} selections={heroMap} title={heroTree.name} />}
            <TalentTree nodes={tree.specNodes} selections={currentMap} title="Spec" />
          </TalentTreePanel>
          <TalentLegend showMissing={false} />
        </TabsContent>

        <TabsContent value="recommended" className="focus-visible:outline-none">
          {!recommended ? (
            <div className="border-l-2 border-severity-upgrade pl-5 text-sm text-text-muted">
              No recommended build has been seeded for this class/spec yet.
            </div>
          ) : (
            <>
              {matchSummary && (
                <p className="mb-4 text-sm text-text-muted">
                  Your build matches{' '}
                  <span className="figure font-semibold text-text">
                    {matchSummary.matched} of {matchSummary.total}
                  </span>{' '}
                  recommended picks.
                  {matchSummary.missingNodeIds.length > 0 && ' The ones you are missing are marked in amber.'}
                </p>
              )}
              {recommended.notes && <p className="mb-4 text-xs italic text-text-dim">{recommended.notes}</p>}
              <TalentTreePanel>
                <TalentTree nodes={tree.classNodes} selections={recommendedMap} missing={missing} title="Class" />
                <TalentTree nodes={tree.specNodes} selections={recommendedMap} missing={missing} title="Spec" />
              </TalentTreePanel>
              <TalentLegend showMissing={missing.size > 0} />
              <p className="label mt-2">Hero talent recommendations aren't seeded yet, so this covers class and spec picks only.</p>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
