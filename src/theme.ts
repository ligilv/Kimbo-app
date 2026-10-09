import { DefaultTheme, type Theme } from '@react-navigation/native';

// Black and white only, light theme only. Urgency is shown by lightness, never
// by hue: normal = outlined, soon = grey well, overdue = solid black.
// Contrast on white: ink 18.9:1, muted 5.3:1 (AA for body text).
export const colors = {
  ink: '#111111', // text, primary buttons, overdue cards
  ground: '#FFFFFF', // app background
  muted: '#6B6B6B', // secondary text
  line: '#E5E5E5', // outlines and dividers
  well: '#F5F5F5', // Mira's bubbles, inputs, "soon" cards
  // Older names kept so shared components read naturally.
  primary: '#111111',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#111111',
} as const;

// Nunito, one file per weight. The family name is the file name on Android and the
// PostScript name on iOS; both are e.g. "Nunito-Bold", so one name works on both.
// Always pair with fontWeight 'normal': asking Android for bold on top of
// Nunito-Bold makes it fake-bold the already-bold file.
export const fonts = {
  regular: 'Nunito-Regular', // body text
  semiBold: 'Nunito-SemiBold', // labels, buttons
  bold: 'Nunito-Bold', // headings
  extraBold: 'Nunito-ExtraBold', // big numbers
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.ink,
    background: colors.ground,
    card: colors.ground,
    text: colors.ink,
    border: colors.line,
    notification: colors.ink,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: 'normal' },
    medium: { fontFamily: fonts.semiBold, fontWeight: 'normal' },
    bold: { fontFamily: fonts.bold, fontWeight: 'normal' },
    heavy: { fontFamily: fonts.extraBold, fontWeight: 'normal' },
  },
};
