import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

export function KimboBubble({ text }: { text: string }) {
  return (
    <View style={styles.kimboRow}>
      <Image
        source={require('@/assets/images/kimbo-avatar.png')}
        style={styles.avatar}
        accessibilityIgnoresInvertColors
      />
      <View style={[styles.bubble, styles.kimboBubble]}>
        <Text style={styles.kimboText}>{text}</Text>
      </View>
    </View>
  );
}

type UserBubbleProps = {
  text: string;
  editing: boolean;
  onPress: () => void;
};

// Tapping your own answer lets you change it.
export function UserBubble({ text, editing, onPress }: UserBubbleProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${text}. Double tap to change`}
      style={({ pressed }) => [
        styles.bubble,
        styles.userBubble,
        editing && styles.userBubbleEditing,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.userText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kimboRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  kimboBubble: {
    maxWidth: '78%',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
  },
  kimboText: {
    fontSize: 16,
    lineHeight: 23,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userBubbleEditing: {
    borderColor: colors.accent,
  },
  userText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.semiBold,
    color: colors.background,
  },
  pressed: { opacity: 0.85 },
});
