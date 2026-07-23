/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';

/**
 * The app is locked to the light white + blue palette from the shipping
 * reference so the look is identical on every device (the reference has no
 * dark variant). Flip this back to a scheme-aware read if dark mode returns.
 */
export function useTheme() {
  return Colors.light;
}
