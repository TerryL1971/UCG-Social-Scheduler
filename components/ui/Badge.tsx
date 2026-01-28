// components/ui/Badge.tsx

'use client';

import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  dot?: boolean;
}

export function Badge({ className, variant = 'default', dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full border transition-colors',
        variant === 'default' && 'bg-red-100 text-red-700 border-red-200',
        variant === 'success' && 'bg-green-100 text-green-700 border-green-200',
        variant === 'warning' && 'bg-yellow-100 text-yellow-700 border-yellow-200',
        variant === 'error' && 'bg-red-100 text-red-700 border-red-200',
        variant === 'info' && 'bg-blue-100 text-blue-700 border-blue-200',
        variant === 'neutral' && 'bg-muted text-muted-foreground border-border',
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          variant === 'default' && 'bg-red-600',
          variant === 'success' && 'bg-green-600',
          variant === 'warning' && 'bg-yellow-600',
          variant === 'error' && 'bg-red-600',
          variant === 'info' && 'bg-blue-600',
          variant === 'neutral' && 'bg-neutral-600'
        )} />
      )}
      {children}
    </span>
  );
}
