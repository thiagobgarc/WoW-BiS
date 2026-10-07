import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import type { DomainCharacter, DomainMythicPlusProfile, DomainRaidProgress, EquipmentBySlot, SecondaryStats } from '@/lib/blizzard/domain';
import type { CharacterTalents } from '@/lib/blizzard/getCharacterTalents';
import type { BisEntry } from '@mythos/core/bis';
import type { RecommendedTalentBuild } from '@mythos/core/talents';
import type { MetaTier } from '@/lib/meta/types';
import type { BisItemTooltip } from '@/lib/blizzard/itemTooltip';
import { CharacterHeader } from './CharacterHeader';
import { PaperDoll, PaperDollSkeleton } from './PaperDoll';
import { StatsPanel } from './StatsPanel';
import { RefreshButton } from './RefreshButton';
import { UpgradeBoard } from '@/components/upgrade-board/UpgradeBoard';
import { TalentTreeSection } from '@/components/talents/TalentTreeSection';
import { RaidProgressionPanel } from '@/components/progression/RaidProgressionPanel';
import { MythicPlusPanel } from '@/components/progression/MythicPlusPanel';
import { timeAgo } from '@mythos/core/utils';

interface Props {
  character: DomainCharacter;
  equipment: EquipmentBySlot;
  stats: SecondaryStats;
  avatarUrl: string | null;
  mock: boolean;
  fetchedAt: number;
  stale?: boolean;
  bisEntries: BisEntry[];
  bisSeeded: boolean;
  bisIcons: Record<number, string>;
  /** Tooltip detail per BiS item id; items without one show a minimal tooltip. */
  bisTooltips: Record<number, BisItemTooltip>;
  statPriority?: (keyof SecondaryStats)[];
  talents: CharacterTalents | null;
  recommendedTalents: RecommendedTalentBuild | null;
  raidProgress: DomainRaidProgress | null;
  mythicPlus: DomainMythicPlusProfile | null;
  metaTier: MetaTier | null;
}

interface RefreshableData {
  character: DomainCharacter;
  equipment: EquipmentBySlot;
  stats: SecondaryStats;
  avatarUrl: string | null;
  mock: boolean;
  fetchedAt: number;
  stale: boolean;
}

/** Notices are achromatic with a rule: an advisory is not data, so it gets no
 *  hue. The stale notice keeps amber, because caution is its actual meaning. */
function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'caution'; children: React.ReactNode }) {
  return (
    <p
      className={`border-l-2 pl-4 text-xs leading-relaxed ${
        tone === 'caution' ? 'border-severity-upgrade text-severity-upgrade' : 'border-rule-strong text-text-muted'
      }`}
    >
      {children}
    </p>
  );
}

export function CharacterPage({
  character: initialCharacter,
  equipment: initialEquipment,
  stats: initialStats,
  avatarUrl: initialAvatarUrl,
  mock: initialMock,
  fetchedAt: initialFetchedAt,
  stale: initialStale,
  bisEntries,
  bisSeeded,
  bisIcons,
  bisTooltips,
  statPriority,
  talents,
  recommendedTalents,
  raidProgress,
  mythicPlus,
  metaTier,
}: Props) {
  const [data, setData] = useState<RefreshableData>({
    character: initialCharacter,
    equipment: initialEquipment,
    stats: initialStats,
    avatarUrl: initialAvatarUrl,
    mock: initialMock,
    fetchedAt: initialFetchedAt,
    stale: initialStale ?? false,
  });
  const [refreshing, setRefreshing] = useState(false);

  async function refetch() {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({
        region: data.character.region,
        realm: data.character.realmSlug,
        name: data.character.name,
      });
      const res = await fetch(`/api/character?${params}`);
      if (res.ok) {
        const fresh = (await res.json()) as RefreshableData;
        setData(fresh);
      }
    } finally {
      setRefreshing(false);
    }
  }

  const { character, equipment, stats, avatarUrl, mock, fetchedAt, stale } = data;

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl px-6 pb-20">
        {(mock || stale) && (
          <div className="space-y-3 pt-8">
            {mock && (
              <Notice>
                Showing sample data — no Blizzard API credentials are configured. Set BLIZZARD_CLIENT_ID and
                BLIZZARD_CLIENT_SECRET to see this character's real gear.
              </Notice>
            )}
            {stale && <Notice tone="caution">The Blizzard API is temporarily unavailable. Showing gear cached {timeAgo(fetchedAt)}.</Notice>}
          </div>
        )}

        <div className="pt-10">
          <CharacterHeader character={character} equipment={equipment} avatarUrl={avatarUrl} metaTier={metaTier} />
        </div>

        <Tabs defaultValue="gear" className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <TabsList className="border-none">
              <TabsTrigger value="gear">Gear</TabsTrigger>
              <TabsTrigger value="raid">Raid progression</TabsTrigger>
              <TabsTrigger value="mythic-plus">Mythic+</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-4">
              <span className="label">Updated {timeAgo(fetchedAt)}</span>
              <RefreshButton region={character.region} realm={character.realmSlug} name={character.name} onRefreshed={refetch} />
            </div>
          </div>

          <div className="border-t border-rule">
            <TabsContent value="gear" className="space-y-14 pt-10">
              <section aria-label="Equipped gear">{refreshing ? <PaperDollSkeleton /> : <PaperDoll equipment={equipment} />}</section>

              <StatsPanel stats={stats} priorityOrder={statPriority} />

              <section aria-label="Upgrade board">
                <UpgradeBoard equipment={equipment} bisEntries={bisEntries} bisIcons={bisIcons} bisTooltips={bisTooltips} seeded={bisSeeded} />
              </section>

              {talents && (
                <section aria-label="Talents">
                  <TalentTreeSection
                    tree={talents.tree}
                    current={talents.current}
                    heroTree={talents.heroTree}
                    heroSelections={talents.heroSelections}
                    recommended={recommendedTalents}
                  />
                </section>
              )}
            </TabsContent>

            <TabsContent value="raid" className="pt-10">
              {raidProgress ? (
                <RaidProgressionPanel progress={raidProgress} />
              ) : (
                <p className="text-sm text-text-dim">Raid progression isn't available for this character right now.</p>
              )}
            </TabsContent>

            <TabsContent value="mythic-plus" className="pt-10">
              {mythicPlus ? (
                <MythicPlusPanel profile={mythicPlus} />
              ) : (
                <p className="text-sm text-text-dim">Mythic+ progress isn't available for this character right now.</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
