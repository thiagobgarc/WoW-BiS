import type { MetaTier } from '@/lib/meta/types';
import { cn } from '@/lib/utils/cn';

// Reuses the app's existing 4-step severity scale (BiS/Close/Upgrade/Gap,
// green->yellow->orange->red) rather than inventing a second color ramp —
// S/A/B/C is the same "how good is this" gradient, just for specs not gear.
const TIER_STYLES: Record<MetaTier, string> = {
  S: 'bg-severity-bis/15 text-severity-bis border-severity-bis/40',
  A: 'bg-severity-close/15 text-severity-close border-severity-close/40',
  B: 'bg-severity-upgrade/15 text-severity-upgrade border-severity-upgrade/40',
  C: 'bg-severity-gap/15 text-severity-gap border-severity-gap/40',
};

interface Props {
  tier: MetaTier;
  className?: string;
}

export function TierBadge({ tier, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded border text-xs font-bold shrink-0',
        TIER_STYLES[tier],
        className,
      )}
      title={`${tier}-tier for Mythic+`}
    >
      {tier}
    </span>
  );
}
