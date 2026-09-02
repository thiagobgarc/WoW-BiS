import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { classColor } from '@/lib/utils/classColors';
import type { MetaRole, MetaTier, MetaTierEntry } from '@/lib/meta/types';

interface Props {
  entries: MetaTierEntry[];
  lastUpdated: string;
  source: string;
}

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

export function MetaTierList({ entries, lastUpdated, source }: Props) {
  const [role, setRole] = useState<MetaRole>('dps');

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
            needs a TabsContent for a11y wiring, but the tier grouping is
            already driven by the `role` state above, so a single panel
            covers all three tabs rather than duplicating markup per role. */}
        <TabsContent value={role} className="focus-visible:outline-none">
          <div className="space-y-3 mt-4">
            {TIERS.map((tier) => {
              const specs = byTier.get(tier) ?? [];
              if (specs.length === 0) return null;
              const style = TIER_ROW_STYLES[tier];
              return (
                <div key={tier} className={`flex items-stretch gap-3 rounded-lg border ${style.bg} p-3`}>
                  <div className={`flex items-center justify-center w-10 shrink-0 text-xl font-extrabold ${style.text}`}>
                    {style.label}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {specs.map((s) => (
                      <span
                        key={`${s.class}-${s.spec}`}
                        className="px-3 py-1.5 rounded-md text-sm font-medium bg-panel border border-white/8"
                        style={{ color: classColor(s.class) }}
                      >
                        {s.spec} {s.class}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-text-dim mt-4">
        Mythic+ rankings, last updated {lastUpdated} — sourced from {source}. Rankings shift with tuning and gear
        access; treat this as a snapshot, not gospel.
      </p>
    </div>
  );
}
