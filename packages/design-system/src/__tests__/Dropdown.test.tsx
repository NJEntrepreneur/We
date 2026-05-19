import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from '../components/Dropdown.js';

function TestDropdown(): React.ReactElement {
  return (
    <Dropdown>
      <DropdownTrigger>Open Menu</DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>Actions</DropdownLabel>
        <DropdownItem>Edit</DropdownItem>
        <DropdownSeparator />
        <DropdownItem>Delete</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

describe('Dropdown', () => {
  it('does not show content before trigger is clicked', () => {
    render(<TestDropdown />);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('shows menu items after trigger click', async () => {
    const user = userEvent.setup();
    render(<TestDropdown />);
    await user.click(screen.getByText('Open Menu'));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('renders the label when open', async () => {
    const user = userEvent.setup();
    render(<TestDropdown />);
    await user.click(screen.getByText('Open Menu'));
    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('renders the separator when open', async () => {
    const user = userEvent.setup();
    render(<TestDropdown />);
    await user.click(screen.getByText('Open Menu'));
    await waitFor(() => {
      expect(document.querySelector('[role="separator"]')).toBeInTheDocument();
    });
  });

  it('calls onSelect when a DropdownItem is clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <Dropdown>
        <DropdownTrigger>Open</DropdownTrigger>
        <DropdownContent>
          <DropdownItem onSelect={handler}>Action</DropdownItem>
        </DropdownContent>
      </Dropdown>,
    );
    await user.click(screen.getByText('Open'));
    await waitFor(() => screen.getByText('Action'));
    await user.click(screen.getByText('Action'));
    expect(handler).toHaveBeenCalled();
  });

  it('closes after an item is selected', async () => {
    const user = userEvent.setup();
    render(
      <Dropdown>
        <DropdownTrigger>Open</DropdownTrigger>
        <DropdownContent>
          <DropdownItem>Action</DropdownItem>
        </DropdownContent>
      </Dropdown>,
    );
    await user.click(screen.getByText('Open'));
    await waitFor(() => screen.getByText('Action'));
    await user.click(screen.getByText('Action'));
    await waitFor(() => {
      expect(screen.queryByText('Action')).not.toBeInTheDocument();
    });
  });

  it('trigger has aria-haspopup=menu', () => {
    render(<TestDropdown />);
    expect(screen.getByText('Open Menu')).toHaveAttribute('aria-haspopup', 'menu');
  });
});
