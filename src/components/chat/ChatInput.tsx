import { ArrowUp } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
  allowEmpty?: boolean;
};

// Text box + send button for chat screens. (Onboarding keeps its own composer.)
export function ChatInput({
  value,
  onChangeText,
  onSend,
  placeholder,
  disabled,
  allowEmpty,
}: Props) {
  const canSend = !disabled && (allowEmpty || value.trim().length > 0);
  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(28, 43, 36, 0.45)"
        editable={!disabled}
        multiline
        maxLength={500}
        style={styles.input}
        accessibilityLabel={placeholder}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
        style={({ pressed }) => [
          styles.send,
          !canSend && styles.sendDisabled,
          pressed && styles.pressed,
        ]}
      >
        <ArrowUp size={22} color={colors.background} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.8 },
});
