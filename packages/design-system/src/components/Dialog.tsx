import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cx } from '../lib/cx.js';

// ── Re-export primitive roots that need no additional styling ─────────────────
export const Dialog        = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose   = RadixDialog.Close;
export const DialogPortal  = RadixDialog.Portal;

// ── Overlay ───────────────────────────────────────────────────────────────────

export interface DialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay> {}

export function DialogOverlay({
  className,
  ...props
}: DialogOverlayProps): React.ReactElement {
  return (
    <RadixDialog.Overlay
      className={cx(
        'fixed inset-0 z-50 bg-black/50',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps): React.ReactElement {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cx(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-lg max-h-[85vh] overflow-auto',
          'rounded-lg bg-white p-6 shadow-xl',
          'focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </DialogPortal>
  );
}

// ── Header, Footer, Title, Description ───────────────────────────────────────

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({
  className,
  ...props
}: DialogHeaderProps): React.ReactElement {
  return (
    <div
      className={cx('flex flex-col gap-1.5 mb-4', className)}
      {...props}
    />
  );
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({
  className,
  ...props
}: DialogFooterProps): React.ReactElement {
  return (
    <div
      className={cx('flex justify-end gap-2 mt-6', className)}
      {...props}
    />
  );
}

export interface DialogTitleProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Title> {}

export function DialogTitle({
  className,
  ...props
}: DialogTitleProps): React.ReactElement {
  return (
    <RadixDialog.Title
      className={cx('text-lg font-semibold text-gray-900', className)}
      {...props}
    />
  );
}

export interface DialogDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Description> {}

export function DialogDescription({
  className,
  ...props
}: DialogDescriptionProps): React.ReactElement {
  return (
    <RadixDialog.Description
      className={cx('text-sm text-gray-500', className)}
      {...props}
    />
  );
}
