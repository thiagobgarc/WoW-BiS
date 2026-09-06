import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 rounded-md border border-white/12 bg-panel px-4 text-sm text-text placeholder:text-text-faint',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
