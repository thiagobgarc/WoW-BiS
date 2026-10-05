import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import { classColor } from '@mythos/core/utils';
import { foldedMatchRange } from '@mythos/core/realm';
import { foldName, type CharacterSuggestion } from '@/lib/search/characterSearch';
import type { RecentCharacter } from '@/lib/hooks/useRecentCharacters';

interface Props {
  id: string;
  value: string;
  /** Lowercase region code; its characters are ranked first. */
  region: string;
  onChange: (value: string) => void;
  onSelect: (character: RecentCharacter) => void;
  recent: RecentCharacter[];
}

interface Option {
  key: string;
  name: string;
  realmName: string;
  realmSlug: string;
  region: string;
  className: string | null;
  avatarUrl: string | null;
  recent: boolean;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 180;

// Exact name, not folded: "Coolermaster" and "Coolérmaster" can share a realm.
const keyOf = (c: { region: string; realmSlug: string; name: string }) => `${c.region}/${c.realmSlug}/${c.name.toLowerCase()}`;

function Highlighted({ name, query }: { name: string; query: string }) {
  const range = foldedMatchRange(name, query);
  if (!range) return <span className="text-text">{name}</span>;
  const [start, end] = range;
  return (
    <span className="text-text-muted">
      {name.slice(0, start)}
      <mark className="bg-transparent font-semibold text-text">{name.slice(start, end)}</mark>
      {name.slice(end)}
    </span>
  );
}

function Avatar({ option }: { option: Option }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-sunken text-xs font-semibold text-text-dim"
      style={{ borderColor: option.className ? classColor(option.className) : 'var(--color-rule-strong)' }}
      aria-hidden="true"
    >
      {option.avatarUrl && !failed ? (
        <img src={option.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        option.name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/**
 * Suggests characters as the name is typed: recently viewed ones first
 * (instant, local), then matches from the character search API. Matching
 * ignores accents throughout, so a player who can't type their own name's
 * "ë" still finds it.
 */
export function NameCombobox({ id, value, region, onChange, onSelect, recent }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remote, setRemote] = useState<{ query: string; characters: CharacterSuggestion[] }>({ query: '', characters: [] });
  const [loading, setLoading] = useState(false);

  const query = value.trim();
  const folded = foldName(query);
  const searchable = folded.length >= MIN_QUERY;

  useEffect(() => {
    if (!searchable) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/character-search?q=${encodeURIComponent(query)}&region=${encodeURIComponent(region)}`, {
          signal: controller.signal,
        });
        const data = res.ok ? ((await res.json()) as { characters: CharacterSuggestion[] }) : { characters: [] };
        setRemote({ query: folded, characters: data.characters });
        setLoading(false);
      } catch {
        // Aborted by the next keystroke, or a network blip: either way the
        // recent list still works and the next keystroke tries again.
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, folded, region, searchable]);

  const options = useMemo<Option[]>(() => {
    const recentMatches = recent
      .filter((c) => !folded || foldName(c.name).includes(folded))
      .map((c) => ({ ...c, key: keyOf(c), className: null, avatarUrl: null, recent: true }));
    const seen = new Set(recentMatches.map((o) => o.key));

    // While the next request is in flight, narrow the last answer to what
    // still matches, so the list tightens on every keystroke instead of
    // waiting on the network.
    const fresh = remote.query === folded;
    const remoteMatches = searchable
      ? remote.characters
          .filter((c) => fresh || foldName(c.name).includes(folded))
          .map((c) => ({ ...c, key: keyOf(c), recent: false }))
          .filter((o) => !seen.has(o.key))
      : [];
    return [...recentMatches, ...remoteMatches];
  }, [recent, remote, folded, searchable]);

  useEffect(() => setActiveIndex(-1), [value]);

  const recentCount = options.filter((o) => o.recent).length;
  const showStatus = searchable && options.length === 0;
  const expanded = open && (options.length > 0 || showStatus);

  function select(option: Option) {
    setOpen(false);
    setActiveIndex(-1);
    onSelect({ name: option.name, realmName: option.realmName, realmSlug: option.realmSlug, region: option.region });
  }

  const optionId = (i: number) => `${id}-option-${i}`;

  function renderOption(option: Option, i: number) {
    const active = i === activeIndex;
    return (
      <li
        key={option.key}
        id={optionId(i)}
        role="option"
        aria-selected={active}
        className={cn(
          'flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-2',
          active ? 'bg-white/10' : 'hover:bg-white/6',
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          select(option);
        }}
        onMouseMove={() => setActiveIndex(i)}
      >
        <Avatar option={option} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            <Highlighted name={option.name} query={query} />
          </span>
          <span className="block truncate text-xs text-text-dim">
            {option.className ? `${option.className} · ` : ''}
            {option.realmName}
          </span>
        </span>
        <span className="figure shrink-0 text-xs text-text-dim">{option.region.toUpperCase()}</span>
      </li>
    );
  }

  return (
    <div className="relative flex-1 min-w-[160px]">
      <Input
        id={id}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Character name"
        inputSize="lg"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            return;
          }
          if (!expanded || options.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            select(options[activeIndex]!);
          }
        }}
        className="w-full"
      />
      {expanded && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[4px] border border-rule-strong bg-panel shadow-2xl">
          <ul id={`${id}-listbox`} role="listbox" aria-label="Character suggestions" className="max-h-80 overflow-auto py-1">
            {recentCount > 0 && (
              <li role="presentation" className="label px-4 pb-1 pt-2">
                Recently viewed
              </li>
            )}
            {options.slice(0, recentCount).map((o, i) => renderOption(o, i))}
            {options.length > recentCount && (
              <li role="presentation" className={cn('label px-4 pb-1 pt-2', recentCount > 0 && 'mt-1 border-t border-rule')}>
                Characters
              </li>
            )}
            {options.slice(recentCount).map((o, i) => renderOption(o, recentCount + i))}
            {showStatus && (
              <li role="presentation" className="px-4 py-3 text-sm text-text-muted">
                {loading ? 'Searching…' : 'No characters found. You can still search with the full name and realm.'}
              </li>
            )}
          </ul>
          {searchable && options.length > recentCount && (
            <p className="border-t border-rule px-4 py-1.5 text-right text-[11px] text-text-dim">Suggestions from Raider.IO</p>
          )}
        </div>
      )}
      {/* Announces the result count once a search settles, since focus stays in the input. */}
      <span className="sr-only" aria-live="polite">
        {searchable && !loading ? `${options.length} ${options.length === 1 ? 'suggestion' : 'suggestions'}` : ''}
      </span>
    </div>
  );
}
