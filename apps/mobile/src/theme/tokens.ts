import { Platform } from 'react-native';

/**
 * Design tokens. Components never use raw hex values — change the look here.
 *
 * Opaque reading surfaces keep text clear and high contrast.
 * Light theme only: the target phones are shared, often used outdoors, and a
 * single high-contrast theme is one less thing to test during the hackathon.
 */

export const colors = {
  bg: '#EAF4FF', // pastel learning playground
  surface: '#FAFCFF',
  surfaceSunken: '#EDF4FC',
  border: '#FFFFFF',
  borderStrong: '#B7CDE4',

  ink: '#24334B',
  inkSoft: '#52647D',
  inkMuted: '#52647D',

  primary: '#3579AE', // cool indigo primary
  primaryLip: '#285F89',
  primaryTint: '#D8EBFC',
  onPrimary: '#FFFFFF',

  accent: '#3579AE', // unified indigo identity
  accentLip: '#285F89',
  accentTint: '#E8E1FB',
  onAccent: '#FFFFFF',

  // Problems are amber-brown, not alarm red: a struggling reader should not
  // feel scolded by the UI (affective filter).
  warn: '#9A3412',
  warnTint: '#FFF0E0',
  success: '#2F7D32',
  successTint: '#E7F4E4',

  // One indigo/aqua primary system; red ends a call.
  call: '#3579AE',
  callLip: '#285F89',
  hangup: '#C62828',
  hangupLip: '#8E1B1B',
} as const;

export type CategoryPalette = { solid: string; lip: string; tint: string; ink: string };

/** Restrained category accents; selection surfaces always use primary. */
export const category = {
  topic: { solid: colors.primary, lip: colors.primaryLip, tint: colors.primaryTint, ink: colors.primaryLip },
  level: { solid: colors.primary, lip: colors.primaryLip, tint: colors.primaryTint, ink: colors.primaryLip },
  style: { solid: colors.accent, lip: colors.accentLip, tint: colors.accentTint, ink: colors.accentLip },
  action: { solid: colors.primary, lip: colors.primaryLip, tint: colors.primaryTint, ink: colors.primaryLip },
  language: { solid: colors.primary, lip: colors.primaryLip, tint: colors.primaryTint, ink: colors.primaryLip },
} as const satisfies Record<string, CategoryPalette>;

export type CardCategory = keyof typeof category;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 14, md: 20, lg: 28, pill: 999 } as const;

/** Minimum tap sizes. Bigger than platform minimums on purpose: young users, cheap screens. */
export const touch = { min: 48, primary: 56 } as const;

export const fonts = {
  // Andika: one legible rounded family for headings and reading.
  display: Platform.select({ ios: 'System', android: 'sans-serif', default: 'Arial' })!,
  displayBold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'Arial' })!,
  // Andika (SIL): designed for beginning readers — single-storey a/g,
  // clearly distinct I/l/1. Used for everything the student has to read.
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'Arial' })!,
  bodyBold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'Arial' })!,
} as const;

export const typeScale = {
  display: { fontSize: 30, lineHeight: 40, fontFamily: fonts.displayBold, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 32, fontFamily: fonts.display, fontWeight: '600' as const },
  heading: { fontSize: 17, lineHeight: 26, letterSpacing: 0.35, fontFamily: fonts.display },
  reading: { fontSize: 20, lineHeight: 32, fontFamily: fonts.body }, // answers
  body: { fontSize: 17, lineHeight: 26, fontFamily: fonts.body },
  label: { fontSize: 15, lineHeight: 23, fontFamily: fonts.display },
  caption: { fontSize: 14, lineHeight: 21, fontFamily: fonts.body },
} as const;

export type TypeVariant = keyof typeof typeScale;

export const iconSize = { sm: 20, md: 26, lg: 34, xl: 48 } as const;

/** Reading-size steps for the A− / A+ control on the answer screen. */
export const TEXT_SCALES = [1, 1.15, 1.3, 1.5] as const;

export const shadow = {
  card: {
    shadowColor: '#8DA8C6',
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
} as const;

/** Shared visual metrics; no screen owns a separate sizing system. */
export const layout = {
  screen: 16, border: 1.5, hairline: 1,
  avatarHome: 112, avatarCall: 144, logo: 40,
  choice: 76, control: 88, topic: 172, card: 160, iconTile: 40,
  input: 128, dot: 6, choiceMin: 88, controlMin: 120, brandMin: 180, headerTitleMin: 160,
} as const;

export const gradients = {
  action: ['#4D95CC', '#357EB6', '#2A6C9E'] as const,
  destructive: ['#B52646', '#B92337'] as const,
  avatar: ['#E9F3FF', '#D8ECFC'] as const,
} as const;
