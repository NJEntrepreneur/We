import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs.js';

function TestTabs(): React.ReactElement {
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="billing" disabled>Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account panel</TabsContent>
      <TabsContent value="settings">Settings panel</TabsContent>
      <TabsContent value="billing">Billing panel</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('shows the default tab content', () => {
    render(<TestTabs />);
    // Active panel has data-state="active"
    const panel = screen.getByText('Account panel').closest('[role="tabpanel"]');
    expect(panel).toHaveAttribute('data-state', 'active');
  });

  it('inactive panel has data-state=inactive initially', () => {
    render(<TestTabs />);
    // Inactive panels have hidden="" so text isn't in DOM; navigate via aria-controls
    const settingsTab = screen.getByRole('tab', { name: 'Settings' });
    const panelId = settingsTab.getAttribute('aria-controls');
    const panel = document.getElementById(panelId ?? '');
    expect(panel).toHaveAttribute('data-state', 'inactive');
  });

  it('switches to new tab content on trigger click', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    const panel = screen.getByText('Settings panel').closest('[role="tabpanel"]');
    expect(panel).toHaveAttribute('data-state', 'active');
  });

  it('previously active panel becomes inactive after switch', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    // After switch, account panel has hidden="" — find it via the tab's aria-controls
    const accountTab = screen.getByRole('tab', { name: 'Account' });
    const panelId = accountTab.getAttribute('aria-controls');
    const accountPanel = document.getElementById(panelId ?? '');
    expect(accountPanel).toHaveAttribute('data-state', 'inactive');
  });

  it('marks the active trigger with data-state=active', () => {
    render(<TestTabs />);
    expect(screen.getByRole('tab', { name: 'Account' })).toHaveAttribute('data-state', 'active');
  });

  it('marks the inactive trigger with data-state=inactive', () => {
    render(<TestTabs />);
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('data-state', 'inactive');
  });

  it('disabled tab trigger is not clickable', () => {
    render(<TestTabs />);
    expect(screen.getByRole('tab', { name: 'Billing' })).toBeDisabled();
  });

  it('renders all tabs in a tablist', () => {
    render(<TestTabs />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('clicked trigger becomes active', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    const settingsTab = screen.getByRole('tab', { name: 'Settings' });
    await user.click(settingsTab);
    expect(settingsTab).toHaveAttribute('data-state', 'active');
  });
});
