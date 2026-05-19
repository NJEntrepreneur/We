import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogHeader,
  DialogFooter,
} from '../components/Dialog.js';

function TestDialog({ defaultOpen = false }: { defaultOpen?: boolean }): React.ReactElement {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger>Open Dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('does not show content before the trigger is clicked', () => {
    render(<TestDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows dialog content after trigger click', () => {
    render(<TestDialog />);
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the title inside the dialog', () => {
    render(<TestDialog defaultOpen />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('renders the description inside the dialog', () => {
    render(<TestDialog defaultOpen />);
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('closes when the close button is clicked', () => {
    render(<TestDialog />);
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when Escape is pressed', () => {
    render(<TestDialog />);
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with defaultOpen=true', () => {
    render(<TestDialog defaultOpen />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders DialogHeader and DialogFooter as layout wrappers', () => {
    render(<TestDialog defaultOpen />);
    // Title is inside the header, Cancel is inside the footer
    expect(screen.getByText('Confirm Action')).toBeVisible();
    expect(screen.getByText('Cancel')).toBeVisible();
  });
});
