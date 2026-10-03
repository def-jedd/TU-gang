/**
 * Design tokens. Components never use raw hex values — change the look here.
 *
 * Every text/background pair below meets WCAG AA (4.5:1) for body text.
 * Light theme only: the target phones are shared, often used outdoors, and a
 * single high-contrast theme is one less thing to test during the hackathon.
 */

export const colors = {
  bg: '#FFF8EC', // warm paper — less glare than pure white
  surface: '#FFFFFF',
  surfaceSunken: '#F6EEDD',
  border: '#E6D9BF',
  borderStrong: '#CDBE9F',

  ink: '#1E2433',
  inkSoft: '#4B5468',
  inkMuted: '#636A7D',

  primary: '#0B6E79', // Bicol sea teal, 6:1 with white
  primaryLip: '#074D55',
  primaryTint: '#DDF1F2',
  onPrimary: '#FFFFFF',

  accent: '#FFB627', // sun / pili yellow — always with dark text
  accentLip: '#C98500',
  accentTint: '#FFF3D1',
  onAccent: '#1E2433',

  // Problems are amber-brown, not alarm red: a struggling reader should not
  // feel scolded by the UI (affective filter).
  warn: '#9A3412',
  warnTint: '#FFF0E0',
  success: '#2F7D32',
  successTint: '#E7F4E4',
} as const;

export type CategoryPalette = { solid: string; lip: string; tint: string; ink: string };

/** Card families. Physical printed cards use the same colours. */
export const category = {
  topic: { solid: '#2F7D32', lip: '#1F5C22', tint: '#E7F4E4', ink: '#1F5C22' },
  level: { solid: '#1D5FB4', lip: '#164A8C', tint: '#E4EEFB', ink: '#164A8C' },
  style: { solid: '#C2410C', lip: '#9A3410', tint: '#FFEBDD', ink: '#9A3410' },
  action: { solid: colors.primary, lip: colors.primaryLip, tint: colors.primaryTint, ink: colors.primaryLip },
  language: { solid: '#6D3FB0', lip: '#55308C', tint: '#F1E9FB', ink: '#55308C' },
} as const satisfies Record<string, CategoryPalette>;

export type CardCategory = keyof typeof category;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

/** Minimum tap sizes. Bigger than platform minimums on purpose: young users, cheap screens. */
export const touch = { min: 56, primary: 64 } as const;

export const fonts = {
  // Fredoka: rounded, friendly display face for headings and labels.
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  // Andika (SIL): designed for beginning readers — single-storey a/g,
  // clearly distinct I/l/1. Used for everything the student has to read.
  body: 'Andika_400Regular',
  bodyBold: 'Andika_700Bold',
} as const;

export const typeScale = {
  display: { fontSize: 30, lineHeight: 38, fontFamily: fonts.displayBold },
  title: { fontSize: 24, lineHeight: 31, fontFamily: fonts.display },
  heading: { fontSize: 20, lineHeight: 26, fontFamily: fonts.display },
  reading: { fontSize: 22, lineHeight: 34, fontFamily: fonts.body }, // answers
  body: { fontSize: 18, lineHeight: 27, fontFamily: fonts.body },
  label: { fontSize: 17, lineHeight: 22, fontFamily: fonts.display },
  caption: { fontSize: 15, lineHeight: 20, fontFamily: fonts.body },
} as const;

export type TypeVariant = keyof typeof typeScale;

export const iconSize = { sm: 20, md: 26, lg: 34, xl: 48 } as const;

/** Reading-size steps for the A− / A+ control on the answer screen. */
export const TEXT_SCALES = [1, 1.15, 1.3, 1.5] as const;

export const shadow = {
  card: {
    shadowColor: '#5B4A2A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
} as const;
