import { Text as RNText, type TextProps } from 'react-native';
import { colors, fonts, themedStyles } from '@/theme';

// Use this instead of React Native's Text so every label gets Nunito and ink by default.
export function Text({ style, ...props }: TextProps) {
  return <RNText style={[styles.base, style]} {...props} />;
}

const styles = themedStyles(() => ({
  base: {
    fontFamily: fonts.regular,
    color: colors.text,
  },
}));
