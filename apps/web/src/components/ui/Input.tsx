import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /** `lg` is the character-name field on the search page, which is set at display size. */
  inputSize?: 'default' | 'lg';
}

/**
 * A sunken well rather than an outlined box: the ground reads as the page and
 * the field reads as a place to put something into it. Radius is 4px because
 * this is a control you operate — the data surfaces elsewhere are ruled, not
 * boxed, and carry no radius at all.
 */
export const Input = forwardRef<HTMLInputElement, Props>(({ className, inputSize = 'default', ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-[4px] border border-rule-strong bg-sunken text-text placeholder:text-text-dim',
      'transition-colors duration-150 focus-visible:border-text focus-visible:outline-none',
      inputSize === 'lg'
        ? 'h-[4.25rem] px-5 text-[1.75rem] font-semibold [font-stretch:102%] tracking-tight'
        : 'min-h-[44px] px-4 text-sm',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
