import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';

interface Props {
  region: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}

export function RealmCombobox({ region, value, onChange, id }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      if (!value.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/realms?region=${encodeURIComponent(region)}&q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { realms: string[] };
        setSuggestions(data.realms);
      } catch {
        // network hiccup on an autocomplete call is not worth surfacing an error for
      }
    }, 150);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [value, region]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function selectRealm(realm: string) {
    onChange(realm);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className="relative flex-1 min-w-[160px]" ref={containerRef}>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        placeholder="Realm"
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
            selectRealm(suggestions[activeIndex]!);
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
          {suggestions.map((realm, i) => (
            <li
              key={realm}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                'px-4 py-2 text-sm cursor-pointer',
                i === activeIndex ? 'bg-accent-soft text-text' : 'text-text-muted hover:bg-white/5',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectRealm(realm);
              }}
            >
              {realm}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
