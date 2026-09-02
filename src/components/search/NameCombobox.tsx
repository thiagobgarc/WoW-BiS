import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import type { RecentCharacter } from '@/lib/hooks/useRecentCharacters';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (character: RecentCharacter) => void;
  recent: RecentCharacter[];
}

// Blizzard's API has no character-search-by-name endpoint (only exact
// name+realm lookups), so there's no live data source to suggest from —
// this filters the locally-remembered recently-viewed characters instead.
export function NameCombobox({ id, value, onChange, onSelect, recent }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();
  const suggestions = query ? recent.filter((c) => c.name.toLowerCase().includes(query)) : recent;

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function selectCharacter(c: RecentCharacter) {
    setOpen(false);
    setActiveIndex(-1);
    onSelect(c);
  }

  return (
    <div className="relative flex-1 min-w-[160px]" ref={containerRef}>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        placeholder="Character name"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            selectCharacter(suggestions[activeIndex]!);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="w-full"
      />
      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border border-white/12 bg-panel shadow-xl"
        >
          {suggestions.map((c, i) => (
            <li
              key={`${c.region}-${c.realmSlug}-${c.name}`}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                'px-4 py-2 text-sm cursor-pointer flex items-center justify-between gap-2',
                i === activeIndex ? 'bg-accent-soft text-text' : 'text-text-muted hover:bg-white/5',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCharacter(c);
              }}
            >
              <span>{c.name}</span>
              <span className="text-xs text-text-dim shrink-0">
                {c.realmName} • {c.region.toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
