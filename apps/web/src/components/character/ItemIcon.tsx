import { useState } from 'react';
import { qualityColor } from '@mythos/core/utils';
import { cn } from '@/lib/utils/cn';

interface Props {
  iconUrl: string | null;
  quality: string;
  alt: string;
  size?: 'sm' | 'md';
  empty?: boolean;
}

/**
 * The quality border is how item quality is conveyed everywhere in this app.
 * It works here and not as text color because a border only has to clear the
 * 3:1 non-text bar — rare (#0070dd) and epic (#a335ee) sit at 3.60 and 3.55
 * against a raised surface, below the 4.5:1 that body text needs.
 */
export function ItemIcon({ iconUrl, quality, alt, size = 'md', empty = false }: Props) {
  const [errored, setErrored] = useState(false);
  const dimensions = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const showPlaceholder = empty || !iconUrl || errored;

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border-2 bg-sunken', dimensions)}
      style={{ borderColor: empty ? 'var(--color-rule-strong)' : qualityColor(quality) }}
    >
      {showPlaceholder ? (
        <span className="text-xs text-text-dim" aria-hidden="true">
          {empty ? '—' : '?'}
        </span>
      ) : (
        <img src={iconUrl} alt={alt} className="h-full w-full object-cover" loading="lazy" onError={() => setErrored(true)} />
      )}
    </div>
  );
}
