// components/ui/Button.tsx

'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-lg',
          'transition-all duration-200 select-none',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'active:scale-[0.98]',
          
          // Variants using Tailwind v4 theme colors
          variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-red-700 shadow-sm hover:shadow-md focus:ring-ring',
          variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-neutral-200 border border-border shadow-sm focus:ring-ring',
          variant === 'ghost' && 'text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring',
          variant === 'danger' && 'bg-destructive text-white hover:bg-red-700 shadow-sm hover:shadow-md focus:ring-destructive',
          variant === 'success' && 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md focus:ring-green-500',
          
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm gap-1.5 min-h-[32px]',
          size === 'md' && 'px-4 py-2 text-base gap-2 min-h-[40px]',
          size === 'lg' && 'px-6 py-3 text-lg gap-2.5 min-h-[48px]',
          
          // Full width
          fullWidth && 'w-full',
          
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {!loading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
