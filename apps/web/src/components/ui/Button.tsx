import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Achromatic by measurement, not taste. `primary` used to be `bg-accent
 * text-white`, and --accent is the looked-up character's class color: on 10
 * of the 13 classes that put white text on a fill it fails AA against (monk
 * 1.33:1, rogue 1.14:1, priest 1.00:1), and no single foreground passes on
 * all 13. A neutral solid is 15.8:1 on every character page, and it leaves
 * color to mean something — see global.css.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[4px] text-sm font-semibold [font-stretch:95%] transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none no-underline',
  {
    variants: {
      variant: {
        primary: 'bg-text text-bg hover:bg-white',
        secondary: 'bg-white/10 text-text hover:bg-white/16',
        ghost: 'bg-transparent text-text-muted hover:bg-white/6 hover:text-text',
      },
      size: {
        default: 'min-h-[44px] px-5',
        sm: 'min-h-[36px] px-3 text-xs',
        icon: 'min-h-[44px] w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';
