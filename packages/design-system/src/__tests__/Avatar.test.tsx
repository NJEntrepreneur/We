import React from 'react';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/Avatar.js';

describe('Avatar', () => {
  it('renders the fallback when no image src is provided', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('shows the fallback when image fails to load (jsdom behaviour)', () => {
    // jsdom cannot load images, so Radix Avatar always shows the fallback.
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.png" alt="Alice" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('applies sm size classes', () => {
    const { container } = render(
      <Avatar size="sm">
        <AvatarFallback>S</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass('h-8', 'w-8');
  });

  it('applies md size classes (default)', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>M</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass('h-10', 'w-10');
  });

  it('applies lg size classes', () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>L</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass('h-12', 'w-12');
  });

  it('applies xl size classes', () => {
    const { container } = render(
      <Avatar size="xl">
        <AvatarFallback>XL</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass('h-16', 'w-16');
  });

  it('is rounded-full', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('forwards className to the root', () => {
    const { container } = render(
      <Avatar className="ring-2 ring-blue-500">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>,
    );
    expect(container.firstChild).toHaveClass('ring-2');
  });

  it('AvatarFallback renders its children', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
