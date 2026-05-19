import React from 'react';
import * as Label from '@radix-ui/react-label';
import { cx } from '../lib/cx.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Rendered as an accessible <label> element. */
  label?:    string;
  /** Displayed below the input in red; sets aria-invalid. */
  error?:    string;
  /** Displayed below the input as hint text. */
  hint?:     string;
  /** Wrapping container className. */
  wrapperClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  className,
  wrapperClassName,
  disabled,
  required,
  ...props
}: InputProps): React.ReactElement {
  const inputId    = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId    = inputId ? `${inputId}-error` : undefined;
  const hintId     = inputId ? `${inputId}-hint` : undefined;
  const hasError   = Boolean(error);

  const describedBy = [
    hasError && errorId,
    hint     && hintId,
  ].filter((x): x is string => Boolean(x)).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', wrapperClassName)}>
      {label !== undefined && (
        <Label.Root
          htmlFor={inputId}
          className={cx(
            'text-sm font-medium text-gray-700',
            disabled && 'opacity-50',
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">*</span>
          )}
        </Label.Root>
      )}
      <input
        id={inputId}
        className={cx(
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          hasError
            ? 'border-red-500 focus-visible:ring-red-500'
            : 'border-gray-300 focus-visible:ring-blue-500 focus-visible:border-transparent',
          className,
        )}
        disabled={disabled}
        required={required}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hasError && error !== undefined && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!hasError && hint !== undefined && (
        <p id={hintId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
