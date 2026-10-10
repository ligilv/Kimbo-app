import { useEffect, useSyncExternalStore } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Text } from '@/components/Text';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

type Toast = { id: number; text: string; action?: { label: string; onPress: () => void } };

const SHOW_MS = 4_000;
let current: Toast | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

// Routine updates get a quiet toast, never a modal.
export function showToast(text: string, action?: Toast['action']) {
  current = { id: Date.now(), text, action };
  emit();
}

const hide = () => {
  current = null;
  emit();
};

// Shown at the top of the screen: at the bottom it covered the text box.
export function ToastHost({ top }: { top: number }) {
  const toast = useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(150)}
      style={[styles.toast, { top }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{toast.text}</Text>
      {toast.action && (
        <Pressable
          onPress={() => {
            toast.action!.onPress();
            hide();
          }}
          accessibilityRole="button"
          hitSlop={12}
          style={styles.action}
        >
          <Text style={styles.actionText}>{toast.action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  text: { flex: 1, color: colors.ground, fontSize: 15, paddingVertical: spacing.md },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  actionText: { color: colors.ground, fontFamily: fonts.bold, fontSize: 15, textDecorationLine: 'underline' },
}));
