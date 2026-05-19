import type { Config } from 'tailwindcss';
import { colors } from './src/tokens/colors.js';
import { spacing } from './src/tokens/spacing.js';
import { radius } from './src/tokens/radius.js';
import { fontFamily, fontSize, fontWeight } from './src/tokens/typography.js';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:       colors.brand,
        success:     colors.success,
        warning:     colors.warning,
        destructive: colors.destructive,
      },
      spacing,
      borderRadius: radius,
      fontFamily,
      fontSize,
      fontWeight,
    },
  },
  plugins: [],
} satisfies Config;
