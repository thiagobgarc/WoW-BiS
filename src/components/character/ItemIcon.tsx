import { useState } from 'react';
import { qualityColor } from '@/lib/utils/itemQuality';
import { cn } from '@/lib/utils/cn';

interface Props {
  iconUrl: string | null;
  quality: string;
  alt: string;
  size?: 'sm' | 'md';
  empty?: boolean;
}

export function ItemIcon({ iconUrl, quality, alt, size = 'md', empty = false }: Props) {
  const [errored, setErrored] = useState(false);
  const dimensions = size === 'sm' ? 'w-9 h-9' : 'w-12 h-12';
  const showPlaceholder = empty || !iconUrl || errored;

  return (
    <div
      className={cn(
        'shrink-0 rounded-md border-2 bg-bg flex items-center justify-center overflow-hidden',
        dimensions,
      )}
      style={{ borderColor: empty ? 'var(--color-text-faint)' : qualityColor(quality) }}
    >
      {showPlaceholder ? (
        <span className="text-text-faint text-xs" aria-hidden="true">
          {empty ? '—' : '?'}
        </span>
      ) : (
        <img src={iconUrl} alt={alt} className="w-full h-full object-cover" loading="lazy" onError={() => setErrored(true)} />
      )}
    </div>
  );
}
