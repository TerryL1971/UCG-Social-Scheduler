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
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98] select-none',
          
          variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-red-700 focus:ring-ring',
          variant === 'secondary' && 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-neutral-200 border border-neutral-200',
          variant === 'ghost' && 'text-neutral-700 hover:bg-neutral-100',
          variant === 'danger' && 'bg-[var(--destructive)] text-white hover:bg-red-700 shadow-sm',
          variant === 'success' && 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
          
          size === 'sm' && 'px-3 py-1.5 text-sm gap-1.5',
          size === 'md' && 'px-4 py-2 text-base gap-2',
          size === 'lg' && 'px-6 py-3 text-lg gap-2.5',
          
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && <span>{icon}</span>}
        {children}
        {!loading && icon && iconPosition === 'right' && <span>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
