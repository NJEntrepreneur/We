export const radius = {
  none:  '0px',
  sm:    '2px',
  md:    '4px',
  lg:    '8px',
  xl:    '12px',
  '2xl': '16px',
  '3xl': '24px',
  full:  '9999px',
} as const;

export type Radius = typeof radius;
