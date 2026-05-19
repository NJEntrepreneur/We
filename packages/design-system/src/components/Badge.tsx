import React from 'react';
import { cx } from '../lib/cx.js';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses = {
  default:     'bg-gray-100 text-gray-800',
  primary:     'bg-blue-100 text-blue-800',
  secondary:   'bg-purple-100 text-purple-800',
  success:     'bg-green-100 text-green-800',
  warning:     'bg-amber-100 text-amber-800',
  destructive: 'bg-red-100 text-red-800',
} as const satisfies Record<BadgeVariant, string>;

export function Badge({
  variant   = 'default',
  className,
  children,
  ...props
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        'transition-colors',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
