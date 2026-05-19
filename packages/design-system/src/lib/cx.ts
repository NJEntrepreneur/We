import { clsx, type ClassValue } from 'clsx';

/** Merge Tailwind classes with conditional logic. */
export function cx(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
