import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/Button.js';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('defaults to primary variant', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-blue-600');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button').className).toContain('bg-gray-100');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').className).toContain('bg-transparent');
  });

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button').className).toContain('bg-red-600');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').className).toContain('h-8');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button').className).toContain('h-12');
  });

  it('calls onClick when clicked', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const handler = vi.fn();
    render(<Button disabled onClick={handler}>Disabled</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('is disabled and shows spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn.querySelector('svg')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button').className).toContain('custom-class');
  });

  it('forwards extra HTML attributes', () => {
    render(<Button data-testid="my-btn" type="submit">Submit</Button>);
    const btn = screen.getByTestId('my-btn');
    expect(btn).toHaveAttribute('type', 'submit');
  });

  it('renders as a child element with asChild', () => {
    render(
      <Button asChild>
        <a href="/home">Go home</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Go home' })).toBeInTheDocument();
  });
});
