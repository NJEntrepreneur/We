import React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cx } from '../lib/cx.js';

// ── Provider (wrap your app root once) ───────────────────────────────────────
export const TooltipProvider = RadixTooltip.Provider;

// ── Root + Trigger (unstyled, pass-through) ───────────────────────────────────
export const Tooltip        = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

// ── Content ───────────────────────────────────────────────────────────────────

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixTooltip.Content> {}

export function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: TooltipContentProps): React.ReactElement {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        sideOffset={sideOffset}
        className={cx(
          'z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5',
          'text-xs text-white shadow-md',
          className,
        )}
        {...props}
      >
        {children}
        <RadixTooltip.Arrow className="fill-gray-900" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  );
}
