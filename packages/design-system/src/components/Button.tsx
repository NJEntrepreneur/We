import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cx } from '../lib/cx.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize    = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  /** Render as a child element (e.g. an anchor) using the Radix Slot pattern. */
  asChild?: boolean;
  /** Show a loading spinner and disable interactions. */
  loading?: boolean;
}

const variantClasses = {
  primary:     'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary:   'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
  ghost:       'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
} as const satisfies Record<ButtonVariant, string>;

const sizeClasses = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
} as const satisfies Record<ButtonSize, string>;

export function Button({
  variant  = 'primary',
  size     = 'md',
  asChild  = false,
  loading  = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps): React.ReactElement {
  const baseClass = cx(
    'inline-flex items-center justify-center rounded-md font-medium',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  // Slot requires exactly one child element, so skip the spinner in asChild mode.
  if (asChild) {
    return (
      <Slot className={baseClass} aria-busy={loading ? true : undefined} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={baseClass}
      disabled={disabled ?? loading}
      aria-busy={loading ? true : undefined}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
