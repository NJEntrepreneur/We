import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../components/Input.js';

describe('Input', () => {
  it('renders a text input', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with a label that is associated to the input', () => {
    render(<Input label="Email" id="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
  });

  it('auto-generates an id from the label when no id is provided', () => {
    render(<Input label="Full Name" />);
    const input = screen.getByLabelText('Full Name');
    expect(input).toHaveAttribute('id', 'input-full-name');
  });

  it('shows a required indicator in the label', () => {
    render(<Input label="Email" required />);
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('renders error message and sets aria-invalid', () => {
    render(<Input label="Email" id="email" error="Invalid email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('applies error border class when error is present', () => {
    render(<Input error="Something went wrong" />);
    expect(screen.getByRole('textbox').className).toContain('border-red-500');
  });

  it('renders hint text when provided (no error)', () => {
    render(<Input hint="We will never share your email" />);
    expect(screen.getByText('We will never share your email')).toBeInTheDocument();
  });

  it('does not render hint when error is also present', () => {
    render(<Input error="Error!" hint="Hint text" />);
    expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('fires onChange when the user types', () => {
    const handler = vi.fn();
    render(<Input onChange={handler} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('forwards placeholder', () => {
    render(<Input placeholder="Enter text…" />);
    expect(screen.getByPlaceholderText('Enter text…')).toBeInTheDocument();
  });

  it('forwards type attribute', () => {
    render(<Input type="password" />);
    // password inputs have no role='textbox'; query directly
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });
});
