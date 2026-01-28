// components/ui/Input.tsx

'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, success, hint, icon, required, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-neutral-700">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-neutral-400">{icon}</span>
            </div>
          )}

          <input
            ref={ref}
            className={cn(
              'block w-full rounded-lg border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:bg-neutral-50 disabled:text-neutral-500',
              icon ? 'pl-10 pr-3 py-2' : 'px-3 py-2',
              error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : success
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                : 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/20',
              className
            )}
            {...props}
          />

          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}

          {success && !error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>

        {hint && !error && !success && (
          <p className="text-sm text-neutral-500">{hint}</p>
        )}

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        {success && !error && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
