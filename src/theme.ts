import { DefaultTheme, type Theme } from '@react-navigation/native';

// Contrast on cream: ink 12.9:1, green 8.4:1, terracotta 3.5:1, turmeric 1.8:1.
// So turmeric is a fill (with ink text on it, 7.1:1), never text on cream,
// and terracotta text needs to be large/bold or paired with an icon.
export const colors = {
  primary: '#1F4D3A', // deep forest green: icon background, app primary
  background: '#F6EFE2', // warm cream: ring and face, app background
  accent: '#F2A33A', // turmeric: ring tip, streaks, CTAs
  text: '#1C2B24', // green-black ink
  alert: '#D9532F', // terracotta: over-target and out-of-range flags
} as const;

// Nunito, one file per weight. The family name is the file name on Android and the
// PostScript name on iOS; both are e.g. "Nunito-Bold", so one name works on both.
// Always pair with fontWeight 'normal': asking Android for bold on top of
// Nunito-Bold makes it fake-bold the already-bold file.
export const fonts = {
  regular: 'Nunito-Regular', // body text
  semiBold: 'Nunito-SemiBold', // labels, buttons
  bold: 'Nunito-Bold', // headings
  extraBold: 'Nunito-ExtraBold', // big numbers (calories, macros)
} as const;

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: 'rgba(28, 43, 36, 0.12)', // ink at 12%
    notification: colors.alert,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: 'normal' },
    medium: { fontFamily: fonts.semiBold, fontWeight: 'normal' },
    bold: { fontFamily: fonts.bold, fontWeight: 'normal' },
    heavy: { fontFamily: fonts.extraBold, fontWeight: 'normal' },
  },
};
