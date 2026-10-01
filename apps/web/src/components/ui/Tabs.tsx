import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils/cn';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex flex-nowrap gap-1 overflow-x-auto border-b border-rule', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'shrink-0 cursor-pointer whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold [font-stretch:95%] text-text-dim transition-colors duration-150',
        'min-h-[44px] hover:text-text',
        // The active marker is the class color as a 2px rule — non-text, so
        // it clears 3:1 on all 13 classes, which it would not as a fill.
        'data-[state=active]:border-accent data-[state=active]:text-text',
        'disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
