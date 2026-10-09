import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { type Mood, Mascot } from '@/components/Mascot';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

type MiraProps = {
  text: string;
  // Solid black only when something is overdue: urgency is lightness, not colour.
  inverted?: boolean;
  mood?: Mood;
  children?: ReactNode; // chips or a card under the message
};

export function MiraBubble({ text, inverted, mood = 'smile', children }: MiraProps) {
  return (
    <View style={styles.miraRow}>
      <Mascot size={32} mood={mood} />
      <View style={styles.miraColumn}>
        <View style={[styles.bubble, styles.miraBubble, inverted && styles.inverted]}>
          <Text style={[styles.miraText, inverted && styles.invertedText]}>{text}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

type UserBubbleProps = {
  text: string;
  editing?: boolean;
  onPress?: () => void; // leave out for a bubble that can't be changed
  trailing?: ReactNode;
};

export function UserBubble({ text, editing, onPress, trailing }: UserBubbleProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? `${text}. Double tap to change` : text}
      style={({ pressed }) => [
        styles.bubble,
        styles.userBubble,
        editing && styles.userBubbleEditing,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.userText}>
        {text}
        {trailing}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  miraRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  miraColumn: { flex: 1, alignItems: 'flex-start', gap: 10 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  miraBubble: {
    maxWidth: '92%',
    backgroundColor: colors.well,
    borderTopLeftRadius: 6,
  },
  inverted: { backgroundColor: colors.ink },
  miraText: { fontSize: 16, lineHeight: 23 },
  invertedText: { color: colors.ground },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: colors.ink,
    borderBottomRightRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  userBubbleEditing: { borderColor: colors.muted, borderStyle: 'dashed' },
  userText: { fontSize: 16, lineHeight: 22, fontFamily: fonts.regular, color: colors.ground },
  pressed: { opacity: 0.85 },
});
