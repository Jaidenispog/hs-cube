import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

/** Poppins — the geometric sans from the reference design. Loaded once in the root layout. */
export const fontMap = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
};

export const Font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/** Map a numeric/string weight to the matching Poppins family. */
export function fontForWeight(weight?: string | number): string {
  const w = Number(weight);
  if (w >= 700) return Font.bold;
  if (w >= 600) return Font.semibold;
  if (w >= 500) return Font.medium;
  return Font.regular;
}
