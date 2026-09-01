import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import type { DomainCharacter, DomainMythicPlusProfile, DomainRaidProgress, EquipmentBySlot, SecondaryStats } from '@/lib/blizzard/domain';
import type { CharacterTalents } from '@/lib/blizzard/getCharacterTalents';
import type { BisEntry } from '@/lib/bis/types';
import type { RecommendedTalentBuild } from '@/lib/talents/types';
import { CharacterHeader } from './CharacterHeader';
import { PaperDoll, PaperDollSkeleton } from './PaperDoll';
import { StatsPanel } from './StatsPanel';
import { RefreshButton } from './RefreshButton';
import { UpgradeBoard } from '@/components/upgrade-board/UpgradeBoard';
import { TalentTreeSection } from '@/components/talents/TalentTreeSection';
import { RaidProgressionPanel } from '@/components/progression/RaidProgressionPanel';
import { MythicPlusPanel } from '@/components/progression/MythicPlusPanel';
import { timeAgo } from '@/lib/utils/format';

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
  statPriority?: (keyof SecondaryStats)[];
  talents: CharacterTalents | null;
  recommendedTalents: RecommendedTalentBuild | null;
  raidProgress: DomainRaidProgress | null;
  mythicPlus: DomainMythicPlusProfile | null;
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
  statPriority,
  talents,
  recommendedTalents,
  raidProgress,
  mythicPlus,
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
      <div className="max-w-5xl mx-auto px-6 pb-16 space-y-8">
        {mock && (
          <div className="rounded-md border border-link/30 bg-link/10 text-link text-xs p-3">
            Showing sample data — no Blizzard API credentials configured yet. Set BLIZZARD_CLIENT_ID/SECRET to see
            this character's real gear.
          </div>
        )}
        {stale && (
          <div className="rounded-md border border-severity-upgrade/30 bg-severity-upgrade/10 text-severity-upgrade text-xs p-3">
            ⚠️ The Blizzard API is temporarily unavailable — showing cached data from {timeAgo(fetchedAt)}.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CharacterHeader character={character} equipment={equipment} avatarUrl={avatarUrl} />
        </div>

        <Tabs defaultValue="gear">
          <TabsList className="mb-0">
            <TabsTrigger value="gear">Gear</TabsTrigger>
            <TabsTrigger value="raid">Raid Progression</TabsTrigger>
            <TabsTrigger value="mythic-plus">Mythic+</TabsTrigger>
          </TabsList>

          <div className="flex items-center justify-between text-xs text-text-dim my-4">
            <span>Last updated {timeAgo(fetchedAt)}</span>
            <RefreshButton region={character.region} realm={character.realmSlug} name={character.name} onRefreshed={refetch} />
          </div>

          <TabsContent value="gear" className="space-y-8">
            <section aria-label="Equipped gear">{refreshing ? <PaperDollSkeleton /> : <PaperDoll equipment={equipment} />}</section>

            <StatsPanel stats={stats} priorityOrder={statPriority} />

            <section aria-label="Upgrade board">
              <UpgradeBoard equipment={equipment} bisEntries={bisEntries} seeded={bisSeeded} />
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

          <TabsContent value="raid">
            {raidProgress ? (
              <RaidProgressionPanel progress={raidProgress} />
            ) : (
              <div className="rounded-xl border border-white/8 bg-panel p-5 text-sm text-text-dim">
                Raid progression isn't available for this character right now.
              </div>
            )}
          </TabsContent>

          <TabsContent value="mythic-plus">
            {mythicPlus ? (
              <MythicPlusPanel profile={mythicPlus} />
            ) : (
              <div className="rounded-xl border border-white/8 bg-panel p-5 text-sm text-text-dim">
                Mythic+ progress isn't available for this character right now.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
