import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cx } from '../lib/cx.js';

// ── Root ──────────────────────────────────────────────────────────────────────
export const Tabs = RadixTabs.Root;

// ── List ──────────────────────────────────────────────────────────────────────

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof RadixTabs.List> {}

export function TabsList({
  className,
  ...props
}: TabsListProps): React.ReactElement {
  return (
    <RadixTabs.List
      className={cx(
        'inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1',
        className,
      )}
      {...props}
    />
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger> {}

export function TabsTrigger({
  className,
  ...props
}: TabsTriggerProps): React.ReactElement {
  return (
    <RadixTabs.Trigger
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md',
        'px-3 py-1.5 text-sm font-medium',
        'text-gray-600 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixTabs.Content> {}

export function TabsContent({
  className,
  ...props
}: TabsContentProps): React.ReactElement {
  return (
    <RadixTabs.Content
      className={cx(
        'mt-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  );
}
