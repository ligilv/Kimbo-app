import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { colors, fonts } from '@/theme';

// Use this instead of React Native's Text so every label gets Nunito and ink by default.
export function Text({ style, ...props }: TextProps) {
  return <RNText style={[styles.base, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.regular,
    color: colors.text,
  },
});
