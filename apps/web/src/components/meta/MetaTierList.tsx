import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { classColor } from '@mythos/core/utils';
import { specKey, urlSlug } from '@/lib/meta/specIds';
import type {
  MetaContentType,
  MetaRaidDifficulty,
  MetaRole,
  MetaTier,
  MetaTierEntry,
  MetaTierList as MetaTierListData,
} from '@/lib/meta/types';

interface Props {
  mythicPlus: MetaTierListData | null;
  /** One list per raid difficulty; any may be missing. */
  raid: Record<MetaRaidDifficulty, MetaTierListData | null>;
  specIcons: Record<string, string | null>;
}

const DIFFICULTIES: { value: MetaRaidDifficulty; label: string }[] = [
  { value: 'mythic', label: 'Mythic' },
  { value: 'heroic', label: 'Heroic' },
  { value: 'normal', label: 'Normal' },
];

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

function ContentPanel({
  list,
  specIcons,
  aside,
}: {
  list: MetaTierListData;
  specIcons: Record<string, string | null>;
  /** Sits on the role tabs' row: the raid difficulty picker. */
  aside?: React.ReactNode;
}) {
  // Kept across a difficulty switch (same component, new list), so a healer
  // comparing Mythic with Heroic stays on the healer list.
  const [role, setRole] = useState<MetaRole>('dps');

  return (
    <div>
      <Tabs value={role} onValueChange={(v) => setRole(v as MetaRole)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {ROLES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {aside}
        </div>

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

/**
 * Native radios styled as a segmented control: a difficulty is one choice
 * among three, and radios bring arrow-key movement and the "1 of 3" reading
 * for free. Not a second set of Tabs, which would nest tablists with no
 * panels of their own.
 */
function DifficultyPicker({
  value,
  onChange,
  available,
}: {
  value: MetaRaidDifficulty;
  onChange: (d: MetaRaidDifficulty) => void;
  available: Record<MetaRaidDifficulty, boolean>;
}) {
  return (
    // Visibly labelled: "Mythic" alone, beside a "Mythic+" tab, read as
    // another content type. The legend is the label, so a screen reader
    // announces "Raid difficulty, Mythic, 1 of 3".
    <fieldset className="flex items-center gap-3">
      <legend className="label float-left mr-3 leading-[44px] sm:leading-9">Difficulty</legend>
      <div className="flex rounded-[4px] border border-rule-strong p-0.5">
        {DIFFICULTIES.map((d) => (
          <label
            key={d.value}
            // The selected state speaks the tabs' language, a 2px accent
            // rule under the text, rather than a solid white fill, which
            // made this the loudest thing on the page and outshouted the
            // tier letters it only filters.
            // Styled off the radio itself (has-[:checked], has-[:disabled])
            // rather than a JS ternary: the input is the source of truth.
            className={[
              'flex min-h-[44px] cursor-pointer items-center rounded-[3px] px-3.5 text-sm font-semibold [font-stretch:95%] sm:min-h-9',
              'text-text-dim transition-colors duration-150 ease-out motion-reduce:transition-none hover:text-text',
              'has-[:checked]:bg-panel-hover has-[:checked]:text-text has-[:checked]:shadow-[inset_0_-2px_0_var(--color-accent)]',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text',
              'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:disabled]:hover:text-text-dim',
            ].join(' ')}
            // A greyed-out option with no reason reads as broken.
            title={available[d.value] ? undefined : `No ${d.label} tier list has been generated yet`}
          >
            <input
              type="radio"
              name="raid-difficulty"
              value={d.value}
              checked={value === d.value}
              disabled={!available[d.value]}
              onChange={() => onChange(d.value)}
              className="sr-only"
            />
            {d.label}
            {!available[d.value] && <span className="sr-only"> (not available yet)</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const CONTENT_PARAM = 'view';
const DIFFICULTY_PARAM = 'difficulty';

/**
 * The open list lives in the URL (?view=raid&difficulty=heroic), so a
 * refresh keeps it and a link can point straight at the Heroic list.
 * Read after hydration rather than in the initial state: the page is
 * server-rendered without the query, and reading it during render would
 * make the first client render disagree with the HTML.
 */
function useUrlState<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(key);
    if (fromUrl && (allowed as readonly string[]).includes(fromUrl)) setValue(fromUrl as T);
    // Read once on mount; the allowed list is a module constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = (next: T) => {
    setValue(next);
    const url = new URL(window.location.href);
    if (next === initial) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    // replaceState, not pushState: flipping a filter shouldn't fill the
    // Back button with every intermediate view.
    window.history.replaceState(null, '', url);
  };
  return [value, update] as const;
}

export function MetaTierList({ mythicPlus, raid, specIcons }: Props) {
  const [content, setContent] = useUrlState<MetaContentType>(
    CONTENT_PARAM,
    mythicPlus ? 'mythic-plus' : 'raid',
    CONTENT_TYPES.map((c) => c.value),
  );
  const [difficulty, setDifficulty] = useUrlState<MetaRaidDifficulty>(
    DIFFICULTY_PARAM,
    'mythic',
    DIFFICULTIES.map((d) => d.value),
  );
  const anyRaid = DIFFICULTIES.some((d) => raid[d.value]);
  const lists: Record<MetaContentType, MetaTierListData | null> = {
    'mythic-plus': mythicPlus,
    raid: raid[difficulty] ?? null,
  };
  const activeList = lists[content];
  const available = { mythic: !!raid.mythic, heroic: !!raid.heroic, normal: !!raid.normal };

  return (
    <TooltipProvider>
      <Tabs value={content} onValueChange={(v) => setContent(v as MetaContentType)}>
        <TabsList>
          {CONTENT_TYPES.map((c) => (
            <TabsTrigger key={c.value} value={c.value} disabled={c.value === 'raid' ? !anyRaid : !mythicPlus}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={content} className="pt-6 focus-visible:outline-none">
          {activeList ? (
            <ContentPanel
              list={activeList}
              specIcons={specIcons}
              aside={
                content === 'raid' ? (
                  <DifficultyPicker value={difficulty} onChange={setDifficulty} available={available} />
                ) : undefined
              }
            />
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
