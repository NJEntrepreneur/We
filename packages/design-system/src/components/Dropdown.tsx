import React from 'react';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { cx } from '../lib/cx.js';

// ── Re-export primitives that need no additional styling ──────────────────────
export const Dropdown        = RadixDropdown.Root;
export const DropdownTrigger = RadixDropdown.Trigger;
export const DropdownGroup   = RadixDropdown.Group;
export const DropdownPortal  = RadixDropdown.Portal;
export const DropdownSub     = RadixDropdown.Sub;

// ── Content ───────────────────────────────────────────────────────────────────

export interface DropdownContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDropdown.Content> {}

export function DropdownContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: DropdownContentProps): React.ReactElement {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        sideOffset={sideOffset}
        className={cx(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200',
          'bg-white p-1 shadow-md',
          className,
        )}
        {...props}
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

// ── Item ──────────────────────────────────────────────────────────────────────

export interface DropdownItemProps
  extends React.ComponentPropsWithoutRef<typeof RadixDropdown.Item> {}

export function DropdownItem({
  className,
  children,
  ...props
}: DropdownItemProps): React.ReactElement {
  return (
    <RadixDropdown.Item
      className={cx(
        'relative flex cursor-default select-none items-center rounded-sm',
        'px-2 py-1.5 text-sm text-gray-700 outline-none',
        'focus:bg-blue-50 focus:text-blue-900',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </RadixDropdown.Item>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────────

export interface DropdownSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof RadixDropdown.Separator> {}

export function DropdownSeparator({
  className,
  ...props
}: DropdownSeparatorProps): React.ReactElement {
  return (
    <RadixDropdown.Separator
      className={cx('-mx-1 my-1 h-px bg-gray-200', className)}
      {...props}
    />
  );
}

// ── Label ─────────────────────────────────────────────────────────────────────

export interface DropdownLabelProps
  extends React.ComponentPropsWithoutRef<typeof RadixDropdown.Label> {}

export function DropdownLabel({
  className,
  ...props
}: DropdownLabelProps): React.ReactElement {
  return (
    <RadixDropdown.Label
      className={cx('px-2 py-1.5 text-xs font-semibold text-gray-500', className)}
      {...props}
    />
  );
}
