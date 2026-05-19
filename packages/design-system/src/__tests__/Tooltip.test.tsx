import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/Tooltip.js';

function TestTooltip({ delayDuration = 0 }: { delayDuration?: number }): React.ReactElement {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful tip</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function OpenTooltip({ className }: { className?: string }): React.ReactElement {
  return (
    <TooltipProvider>
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent className={className}>Helpful tip</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe('Tooltip', () => {
  it('renders the trigger', () => {
    render(<TestTooltip />);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('does not show tooltip content by default', () => {
    render(<TestTooltip />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip content when open prop is set', () => {
    render(<OpenTooltip />);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('shows tooltip content on pointer enter', async () => {
    const user = userEvent.setup();
    render(<TestTooltip delayDuration={0} />);
    const trigger = screen.getByText('Hover me');
    await user.hover(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip when controlled open prop changes to false', () => {
    function ControlledTooltip({ open }: { open: boolean }): React.ReactElement {
      return (
        <TooltipProvider>
          <Tooltip open={open}>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent>Helpful tip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    const { rerender } = render(<ControlledTooltip open={true} />);
    const trigger = screen.getByText('Hover me');
    // open=true yields "delayed-open" (Radix schedules opening via timer even in controlled mode)
    expect(trigger).not.toHaveAttribute('data-state', 'closed');
    rerender(<ControlledTooltip open={false} />);
    expect(trigger).toHaveAttribute('data-state', 'closed');
  });

  it('applies custom className to TooltipContent', () => {
    render(<OpenTooltip className="custom-tip" />);
    expect(document.querySelector('.custom-tip')).toBeInTheDocument();
  });

  it('shows tooltip on focus', async () => {
    render(<TestTooltip />);
    const trigger = screen.getByText('Hover me');
    await act(async () => {
      fireEvent.focus(trigger);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on blur', async () => {
    render(<TestTooltip />);
    const trigger = screen.getByText('Hover me');
    await act(async () => {
      fireEvent.focus(trigger);
    });
    await act(async () => {
      fireEvent.blur(trigger);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('tooltip content text is accessible', () => {
    render(<OpenTooltip />);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful tip');
  });
});
