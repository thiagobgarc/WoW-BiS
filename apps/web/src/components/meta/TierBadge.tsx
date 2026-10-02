import type { MetaTier } from '@/lib/meta/types';
import { cn } from '@/lib/utils/cn';

// Reuses the app's existing 4-step severity scale (BiS/Close/Upgrade/Gap,
// green->yellow->orange->red) rather than inventing a second color ramp —
// S/A/B/C is the same "how good is this" gradient, just for specs not gear.
// All four clear 6.2:1 as text, so the letter carries the color directly.
const TIER_STYLES: Record<MetaTier, string> = {
  S: 'text-severity-bis',
  A: 'text-severity-close',
  B: 'text-severity-upgrade',
  C: 'text-severity-gap',
};

interface Props {
  tier: MetaTier;
  className?: string;
}

export function TierBadge({ tier, className }: Props) {
  return (
    <span
      className={cn(
        'figure inline-flex min-w-[1.5rem] items-center justify-center border-b-2 border-current text-sm font-extrabold',
        TIER_STYLES[tier],
        className,
      )}
      title={`${tier}-tier for Mythic+`}
    >
      {tier}
    </span>
  );
}
