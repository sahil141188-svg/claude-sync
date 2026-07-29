import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-md hover:opacity-90',
        success: 'bg-success text-success-foreground shadow-md hover:opacity-90',
        destructive: 'bg-destructive text-destructive-foreground shadow-md hover:opacity-90',
        outline: 'border-2 border-border bg-card text-card-foreground hover:bg-muted',
        ghost: 'hover:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
      },
      size: {
        default: 'min-h-12 px-6 text-elder-base',
        sm: 'min-h-10 px-4 text-base',
        lg: 'min-h-16 px-8 text-elder-lg',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
