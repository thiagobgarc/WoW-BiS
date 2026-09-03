import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { classColor } from '@/lib/utils/classColors';
import { specKey } from '@/lib/meta/specIds';
import type { MetaContentType, MetaRole, MetaTier, MetaTierEntry, MetaTierList as MetaTierListData } from '@/lib/meta/types';

interface Props {
  mythicPlus: MetaTierListData | null;
  raid: MetaTierListData | null;
  specIcons: Record<string, string | null>;
}

const CONTENT_TYPES: { value: MetaContentType; label: string }[] = [
  { value: 'mythic-plus', label: 'Mythic+' },
  { value: 'raid', label: 'Raid' },
];

const ROLES: { value: MetaRole; label: string }[] = [
  { value: 'dps', label: 'DPS' },
  { value: 'tank', label: 'Tank' },
  { value: 'healer', label: 'Healer' },
];

const TIERS: MetaTier[] = ['S', 'A', 'B', 'C'];

// Same severity scale as TierBadge — kept in sync there, not reused
// directly, since the row background needs a lower alpha than the badge.
const TIER_ROW_STYLES: Record<MetaTier, { label: string; bg: string; text: string }> = {
  S: { label: 'S', bg: 'bg-severity-bis/10 border-severity-bis/30', text: 'text-severity-bis' },
  A: { label: 'A', bg: 'bg-severity-close/10 border-severity-close/30', text: 'text-severity-close' },
  B: { label: 'B', bg: 'bg-severity-upgrade/10 border-severity-upgrade/30', text: 'text-severity-upgrade' },
  C: { label: 'C', bg: 'bg-severity-gap/10 border-severity-gap/30', text: 'text-severity-gap' },
};

function SpecIcon({ entry, iconUrl }: { entry: MetaTierEntry; iconUrl: string | null }) {
  const color = classColor(entry.class);
  const trigger = (
    <button
      type="button"
      aria-label={`${entry.spec} ${entry.class}`}
      className="w-11 h-11 rounded-md border overflow-hidden bg-panel shrink-0 transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ borderColor: `${color}66`, boxShadow: `0 0 8px ${color}59` }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="flex items-center justify-center w-full h-full text-[10px] font-semibold" style={{ color }} aria-hidden="true">
          {entry.class.slice(0, 2).toUpperCase()}
        </span>
      )}
    </button>
  );

  return (
    <Tooltip trigger={trigger}>
      <div className="text-sm">
        <span className="font-semibold" style={{ color }}>
          {entry.class}
        </span>
        <span className="text-text-dim"> — {entry.spec}</span>
      </div>
    </Tooltip>
  );
}

function RoleTierRows({ entries, role, specIcons }: { entries: MetaTierEntry[]; role: MetaRole; specIcons: Record<string, string | null> }) {
  const byTier = useMemo(() => {
    const grouped = new Map<MetaTier, MetaTierEntry[]>();
    for (const tier of TIERS) grouped.set(tier, []);
    for (const entry of entries) {
      if (entry.role !== role) continue;
      grouped.get(entry.tier)?.push(entry);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.class.localeCompare(b.class) || a.spec.localeCompare(b.spec));
    }
    return grouped;
  }, [entries, role]);

  return (
    <div className="space-y-3 mt-4">
      {TIERS.map((tier) => {
        const specs = byTier.get(tier) ?? [];
        if (specs.length === 0) return null;
        const style = TIER_ROW_STYLES[tier];
        return (
          <div key={tier} className={`flex items-stretch gap-3 rounded-lg border ${style.bg} p-3`}>
            <div className={`flex items-center justify-center w-10 shrink-0 text-xl font-extrabold ${style.text}`}>{style.label}</div>
            <div className="flex flex-wrap gap-2 items-center">
              {specs.map((s) => (
                <SpecIcon key={`${s.class}-${s.spec}`} entry={s} iconUrl={specIcons[specKey(s.class, s.spec)] ?? null} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContentPanel({ list, specIcons }: { list: MetaTierListData; specIcons: Record<string, string | null> }) {
  const [role, setRole] = useState<MetaRole>('dps');

  return (
    <div>
      <Tabs value={role} onValueChange={(v) => setRole(v as MetaRole)}>
        <TabsList>
          {ROLES.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* One panel whose value always equals the current role — Radix
            needs a TabsContent for a11y wiring, but RoleTierRows already
            filters by the `role` state above, so a single panel covers all
            three tabs rather than duplicating markup per role. */}
        <TabsContent value={role} className="focus-visible:outline-none">
          <RoleTierRows entries={list.entries} role={role} specIcons={specIcons} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-text-dim mt-4">
        Last updated {list.lastUpdated} — sourced from {list.source}. Rankings shift with tuning and gear access;
        treat this as a snapshot, not gospel.
      </p>
    </div>
  );
}

export function MetaTierList({ mythicPlus, raid, specIcons }: Props) {
  const [content, setContent] = useState<MetaContentType>(mythicPlus ? 'mythic-plus' : 'raid');
  const lists: Record<MetaContentType, MetaTierListData | null> = { 'mythic-plus': mythicPlus, raid };
  const activeList = lists[content];

  return (
    <TooltipProvider>
      <Tabs value={content} onValueChange={(v) => setContent(v as MetaContentType)}>
        <TabsList>
          {CONTENT_TYPES.map((c) => (
            <TabsTrigger key={c.value} value={c.value} disabled={!lists[c.value]}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={content} className="focus-visible:outline-none">
          {activeList ? (
            <ContentPanel list={activeList} specIcons={specIcons} />
          ) : (
            <div className="rounded-xl border border-severity-upgrade/20 bg-severity-upgrade/5 p-6 text-center text-sm text-text-dim mt-4">
              No {content === 'raid' ? 'raid' : 'Mythic+'} tier list has been seeded for this season yet.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}
