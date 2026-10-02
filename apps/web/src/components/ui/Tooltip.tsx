import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ trigger, children, className }: { trigger: ReactNode; children: ReactNode; className?: string }) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{trigger}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={8}
          className={cn(
            // Semi-transparent + blurred so it reads as a floating overlay
            // stacked on top of the page, like the in-game item tooltip,
            // rather than another opaque card sitting in the layout.
            'z-50 max-w-sm rounded-[4px] border border-rule-strong bg-panel/95 p-3.5 text-sm text-text shadow-2xl backdrop-blur-sm transition-opacity duration-150',
            className,
          )}
        >
          {children}
          <TooltipPrimitive.Arrow className="fill-panel/95" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
