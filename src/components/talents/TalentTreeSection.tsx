import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { diffTalents } from '@/lib/talents/diffTalents';
import { TalentTree } from './TalentTree';
import type { DomainHeroTree, DomainTalentTree, TalentSelection } from '@/lib/blizzard/domain';
import type { RecommendedTalentBuild } from '@/lib/talents/types';

interface Props {
  tree: DomainTalentTree;
  current: TalentSelection[] | null;
  heroTree: DomainHeroTree | null;
  heroSelections: TalentSelection[] | null;
  recommended: RecommendedTalentBuild | null;
}

interface Selection {
  rank: number;
  optionIndex: number;
}

function toMap(selections: { nodeId: number; rank: number; optionIndex: number }[]): Map<number, Selection> {
  return new Map(selections.map((s) => [s.nodeId, { rank: s.rank, optionIndex: s.optionIndex }]));
}

function HeroBadge({ name }: { name: string }) {
  const initials = name
    .split(/[\s']+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="w-14 h-14 rounded-full border-2 border-accent bg-panel flex items-center justify-center text-base font-bold text-accent shrink-0"
      aria-hidden="true"
    >
      {initials}
    </div>
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Talents</h2>
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Build</TabsTrigger>
          <TabsTrigger value="recommended">Recommended (Mythic+)</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="focus-visible:outline-none">
          {current === null && !heroTree && (
            <div className="rounded-md border border-severity-upgrade/30 bg-severity-upgrade/10 text-severity-upgrade text-xs p-3 mb-4">
              No talents selected on this character yet.
            </div>
          )}
          {/* One shared panel/scroll area for all three trees together, not
              three independent boxes — they're small enough now (see the
              sizing constants in TalentTree.tsx) to fit without scrolling on
              a typical desktop viewport; overflow-x-auto here is just a
              narrow-viewport safety net, and it scrolls as one unit. */}
          <div className="overflow-x-auto rounded-lg border border-white/8 bg-bg/60 p-4">
            <div className="flex justify-center items-center gap-2 w-fit mx-auto">
              <TalentTree nodes={tree.classNodes} selections={currentMap} title="Class Talents" />
              {heroTree && (
                <TalentTree
                  nodes={heroTree.nodes}
                  selections={heroMap}
                  title={heroTree.name}
                  badge={<HeroBadge name={heroTree.name} />}
                />
              )}
              <TalentTree nodes={tree.specNodes} selections={currentMap} title="Spec Talents" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recommended" className="focus-visible:outline-none">
          {!recommended ? (
            <div className="rounded-xl border border-severity-upgrade/20 bg-severity-upgrade/5 p-6 text-center text-sm text-text-muted">
              No recommended build has been seeded for this class/spec yet.
            </div>
          ) : (
            <>
              {matchSummary && (
                <div className="text-xs text-text-dim mb-4">
                  Your current build matches {matchSummary.matched} of {matchSummary.total} recommended picks.
                </div>
              )}
              {recommended.notes && <div className="text-xs text-text-dim mb-4 italic">{recommended.notes}</div>}
              <div className="overflow-x-auto rounded-lg border border-white/8 bg-bg/60 p-4">
                <div className="flex justify-center items-start gap-2 w-fit mx-auto">
                  <TalentTree nodes={tree.classNodes} selections={recommendedMap} title="Class Talents" />
                  <TalentTree nodes={tree.specNodes} selections={recommendedMap} title="Spec Talents" />
                </div>
              </div>
              <p className="text-[11px] text-text-dim mt-3">
                Hero talent recommendations aren't seeded yet — this covers class/spec picks only.
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
