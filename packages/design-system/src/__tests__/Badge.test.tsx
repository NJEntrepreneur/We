import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '../components/Badge.js';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('defaults to default variant', () => {
    render(<Badge>Tag</Badge>);
    expect(screen.getByText('Tag').className).toContain('bg-gray-100');
  });

  it('applies primary variant classes', () => {
    render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText('Primary').className).toContain('bg-blue-100');
  });

  it('applies secondary variant classes', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    expect(screen.getByText('Secondary').className).toContain('bg-purple-100');
  });

  it('applies success variant classes', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active').className).toContain('bg-green-100');
  });

  it('applies warning variant classes', () => {
    render(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText('Pending').className).toContain('bg-amber-100');
  });

  it('applies destructive variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('bg-red-100');
  });

  it('renders as a span element', () => {
    render(<Badge>Tag</Badge>);
    expect(screen.getByText('Tag').tagName).toBe('SPAN');
  });

  it('merges custom className', () => {
    render(<Badge className="my-custom">Tag</Badge>);
    expect(screen.getByText('Tag').className).toContain('my-custom');
  });

  it('forwards extra HTML attributes', () => {
    render(<Badge data-testid="my-badge">Info</Badge>);
    expect(screen.getByTestId('my-badge')).toBeInTheDocument();
  });
});
