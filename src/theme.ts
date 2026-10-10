import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { StyleSheet } from 'react-native';

// Black and white only; light by default (a health app shouldn't open dark),
// dark as a choice in Settings. Urgency is shown by lightness, never by hue:
// normal = outlined, soon = grey well, overdue = the solid "ink" bubble (black
// in light mode, white in dark). The only colour is the teal tip of Mira's ring.

export type Scheme = 'light' | 'dark';

type Palette = {
  ink: string; // text, primary buttons, overdue messages
  ground: string; // app background
  muted: string; // secondary text
  line: string; // outlines and dividers
  well: string; // Mira's bubbles, inputs, "soon" messages
  card: string; // filled cards that sit on the background (no outline)
  reply: string; // your replies in the conversation
  onReply: string; // text on them
  // Older names kept so shared components read naturally.
  primary: string;
  background: string;
  surface: string;
  text: string;
};

// Contrast: light ink 15.9:1, muted 5.6:1 on the background (5.1:1 in bubbles);
// dark ink 14.5:1, muted 7.2:1.
const palettes: Record<Scheme, Palette> = {
  light: {
    // Off-white background and soft black text, not #FFF on #000: less glare.
    ink: '#1C1C1E',
    ground: '#F7F7F7',
    muted: '#636368',
    line: '#E2E2E2',
    well: '#ECECEC',
    card: '#FFFFFF', // white cards lift off the off-white, like Apple's Health
    reply: '#1C1C1E',
    onReply: '#FFFFFF',
    primary: '#1C1C1E',
    background: '#F7F7F7',
    surface: '#ECECEC',
    text: '#1C1C1E',
  },
  dark: {
    ink: '#EDEDED',
    ground: '#1C1C1E', // charcoal, not pure black: softer at night
    muted: '#A8A8AC',
    line: '#3D3D40',
    well: '#2E2E31', // a clear step lighter than the background
    card: '#28282B',
    // Replies are mid-grey in dark, so Mira (and a late, white message) stays the loudest.
    reply: '#48484C',
    onReply: '#F2F2F2',
    primary: '#EDEDED',
    background: '#1C1C1E',
    surface: '#2E2E31',
    text: '#EDEDED',
  },
};

let scheme: Scheme = 'dark';
export const getScheme = () => scheme;
export const paletteFor = (s: Scheme) => palettes[s];
// Set by the app root before it renders; screens then redraw with these colours.
export const setScheme = (next: Scheme) => {
  scheme = next;
};

// Reads the current palette when used, so `colors.ink` in JSX and in
// themedStyles always matches the chosen appearance.
export const colors = Object.defineProperties(
  {} as Palette,
  Object.fromEntries(
    (Object.keys(palettes.light) as (keyof Palette)[]).map(key => [
      key,
      { get: () => palettes[scheme][key], enumerable: true },
    ]),
  ),
);

// StyleSheet.create, once per appearance. Styles are looked up when used, so a
// screen redrawn after a switch picks up the other set.
// Typed like StyleSheet.create, so style values keep their exact literal types.
type Styles = Parameters<typeof StyleSheet.create>[0];
export function themedStyles<S extends Styles>(make: () => S & Styles): Readonly<S> {
  const cache: Partial<Record<Scheme, Readonly<S>>> = {};
  return new Proxy({} as Readonly<S>, {
    get: (_, key) => (cache[scheme] ??= StyleSheet.create(make()))[key as keyof S],
  });
}

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

export function navigationThemeFor(s: Scheme): Theme {
  const base = s === 'dark' ? DarkTheme : DefaultTheme;
  const p = palettes[s];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: p.ink,
      background: p.ground,
      card: p.ground,
      text: p.ink,
      border: p.line,
      notification: p.ink,
    },
    fonts: {
      regular: { fontFamily: fonts.regular, fontWeight: 'normal' },
      medium: { fontFamily: fonts.semiBold, fontWeight: 'normal' },
      bold: { fontFamily: fonts.bold, fontWeight: 'normal' },
      heavy: { fontFamily: fonts.extraBold, fontWeight: 'normal' },
    },
  };
}
