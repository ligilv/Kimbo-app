import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Text } from '@/components/Text';
import { deleteServerData } from '@/features/sync/sync';
import { storage } from '@/storage';
import { colors, fonts, radius, spacing } from '@/theme';

const WHAT_GOES = [
  'Your profile and daily targets',
  'Every meal you’ve logged',
  'The copy saved on Kimbo’s server',
];

// Deletes the server copy first, so nothing is left behind. Wiping the phone
// clears the onboarding flag, which sends the app back to the welcome screen.
export function DeleteDataModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<'confirm' | 'deleting' | 'offline'>(
    'confirm',
  );
  const busy = state === 'deleting';

  const remove = async () => {
    setState('deleting');
    if (await deleteServerData()) storage.clearAll();
    else setState('offline');
  };

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onClose}
    >
      <View style={styles.backdrop}>
        <Animated.View
          entering={ZoomIn.springify().damping(20).stiffness(220)}
          style={styles.card}
          accessibilityViewIsModal
        >
          <View style={styles.icon}>
            <TriangleAlert size={28} color={colors.alert} />
          </View>

          {state === 'offline' ? (
            <>
              <Text style={styles.title}>Couldn’t reach Kimbo’s server</Text>
              <Text style={styles.body}>
                Your data on the server can’t be deleted right now. You can try
                again later, or delete it from this phone only. The server copy
                would stay.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Delete all your data?</Text>
              <Text style={styles.body}>This will permanently delete:</Text>
              <View style={styles.list}>
                {WHAT_GOES.map(line => (
                  <Text key={line} style={styles.item}>
                    • {line}
                  </Text>
                ))}
              </View>
              <Text style={styles.warning}>This can’t be undone.</Text>
            </>
          )}

          <Pressable
            onPress={state === 'offline' ? () => storage.clearAll() : remove}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy }}
            style={({ pressed }) => [
              styles.button,
              styles.danger,
              pressed && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.dangerText}>
                {state === 'offline'
                  ? 'Delete from this phone'
                  : 'Delete everything'}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            disabled={busy}
            accessibilityRole="button"
            accessibilityElementsHidden={busy}
            importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'}
            style={({ pressed }) => [
              styles.button,
              busy && styles.hidden,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.keepText}>
              {state === 'offline' ? 'Try again later' : 'Keep my data'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 43, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217, 83, 47, 0.12)',
  },
  title: { fontSize: 22, fontFamily: fonts.extraBold },
  body: { fontSize: 15, lineHeight: 21, opacity: 0.8 },
  list: { gap: spacing.xs },
  item: { fontSize: 15, lineHeight: 21 },
  warning: { fontSize: 15, fontFamily: fonts.bold, color: colors.alert },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  danger: { backgroundColor: colors.alert, marginTop: spacing.sm },
  dangerText: { fontSize: 16, fontFamily: fonts.bold, color: colors.surface },
  keepText: { fontSize: 16, fontFamily: fonts.bold, color: colors.primary },
  hidden: { opacity: 0 },
  pressed: { opacity: 0.8 },
});
