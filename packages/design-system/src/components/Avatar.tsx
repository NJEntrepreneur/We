import React from 'react';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cx } from '../lib/cx.js';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarRootProps
  extends React.ComponentPropsWithoutRef<typeof RadixAvatar.Root> {
  size?: AvatarSize;
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
} as const satisfies Record<AvatarSize, string>;

export function Avatar({
  size      = 'md',
  className,
  children,
  ...props
}: AvatarRootProps): React.ReactElement {
  return (
    <RadixAvatar.Root
      className={cx(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </RadixAvatar.Root>
  );
}

export interface AvatarImageProps
  extends React.ComponentPropsWithoutRef<typeof RadixAvatar.Image> {}

export function AvatarImage({
  className,
  ...props
}: AvatarImageProps): React.ReactElement {
  return (
    <RadixAvatar.Image
      className={cx('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  );
}

export interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof RadixAvatar.Fallback> {}

export function AvatarFallback({
  className,
  children,
  ...props
}: AvatarFallbackProps): React.ReactElement {
  return (
    <RadixAvatar.Fallback
      className={cx(
        'flex h-full w-full items-center justify-center rounded-full',
        'bg-gray-100 font-medium text-gray-600 uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </RadixAvatar.Fallback>
  );
}
