import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { classColor } from '@mythos/core/utils';
import { specKey, urlSlug } from '@/lib/meta/specIds';
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

// Same severity scale as TierBadge — S/A/B/C is the same "how good is this"
// gradient as BiS/Close/Upgrade/Gap, so it reuses that ramp rather than
// introducing a second one. All four clear 6.2:1 as text on this ground.
const TIER_TEXT: Record<MetaTier, string> = {
  S: 'text-severity-bis',
  A: 'text-severity-close',
  B: 'text-severity-upgrade',
  C: 'text-severity-gap',
};

function SpecIcon({ entry, iconUrl }: { entry: MetaTierEntry; iconUrl: string | null }) {
  const color = classColor(entry.class);
  const trigger = (
    /* The class color is the border, never the fill and never the label: as
       non-text it clears 3:1 on all 13 classes, which it does not as text. */
    <a
      href={`/meta/${urlSlug(entry.class)}/${urlSlug(entry.spec)}`}
      aria-label={`${entry.spec} ${entry.class}`}
      className="block h-11 w-11 shrink-0 overflow-hidden rounded-[3px] border-2 bg-sunken no-underline transition-opacity duration-150 hover:opacity-80"
      style={{ borderColor: color }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-text-muted" aria-hidden="true">
          {entry.class.slice(0, 2).toUpperCase()}
        </span>
      )}
    </a>
  );

  return (
    <Tooltip trigger={trigger}>
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: color }} aria-hidden="true" />
        <span className="font-semibold text-text">{entry.spec}</span>
        <span className="text-text-dim">{entry.class}</span>
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
    <div className="mt-2">
      {TIERS.map((tier) => {
        const specs = byTier.get(tier) ?? [];
        if (specs.length === 0) return null;
        return (
          /* A ruled row per tier, with the tier letter as a display figure in
             the left gutter. The tinted rounded box each tier used to sit in
             added four more cards without adding information. */
          <div key={tier} className="grid grid-cols-[2.5rem_1fr] items-start gap-4 border-b border-rule py-4">
            <div className={`figure text-3xl font-extrabold leading-none ${TIER_TEXT[tier]}`} aria-hidden="true">
              {tier}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="sr-only">{tier} tier</h3>
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

      <p className="mt-6 max-w-[64ch] text-xs leading-relaxed text-text-dim">
        Last updated {list.lastUpdated}, sourced from {list.source}. Rankings shift with tuning and gear access, so
        treat this as a snapshot rather than gospel.
      </p>
      {list.notes && <p className="mt-2 max-w-[64ch] text-xs italic leading-relaxed text-text-dim">{list.notes}</p>}
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

        <TabsContent value={content} className="pt-6 focus-visible:outline-none">
          {activeList ? (
            <ContentPanel list={activeList} specIcons={specIcons} />
          ) : (
            <p className="border-l-2 border-severity-upgrade pl-5 text-sm text-text-muted">
              No {content === 'raid' ? 'raid' : 'Mythic+'} tier list has been seeded for this season yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}
