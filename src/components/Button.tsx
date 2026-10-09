import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/Text';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  // One solid black primary per screen; everything else outlined or plain text.
  variant?: 'primary' | 'outline' | 'ghost' | 'inverse';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  small,
  disabled,
  style,
  accessibilityHint,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.large,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          (variant === 'primary' || variant === 'inverse') && {
            color: variant === 'primary' ? colors.ground : colors.ink,
          },
          variant === 'ghost' && styles.ghostLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  large: { minHeight: 52 },
  small: { minHeight: 44, paddingHorizontal: spacing.md + 2 },
  primary: { backgroundColor: colors.ink },
  // White pill for use on a black (overdue) card.
  inverse: { backgroundColor: colors.ground },
  outline: {
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  ghost: { backgroundColor: 'transparent' },
  label: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  labelSmall: { fontSize: 15, fontFamily: fonts.semiBold },
  ghostLabel: { color: colors.muted },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.75 },
}));
