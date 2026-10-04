import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { Text } from '@/components/Text';
import type { Targets } from '@/features/onboarding/targets';
import { colors, fonts, radius, spacing } from '@/theme';

export type PlanChange = {
  before: Targets;
  after: Targets;
  field: string; // e.g. "Diet"
  value: string; // e.g. "Non-veg"
};

const CONFETTI_COLORS = [
  colors.primary,
  colors.accent,
  colors.alert,
  '#7FC8A9',
];
const PIECES = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * Math.PI * 2,
  distance: 70 + (i % 3) * 22,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: i % 2 ? 8 : 6,
}));

const n = (value: number) => Math.round(value).toLocaleString('en-IN');

function Piece({
  burst,
  angle,
  distance,
  color,
  size,
}: (typeof PIECES)[number] & { burst: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - burst.value * burst.value,
    transform: [
      { translateX: Math.cos(angle) * distance * burst.value },
      { translateY: Math.sin(angle) * distance * burst.value },
      { scale: 1 - burst.value * 0.4 },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.piece,
        { width: size, height: size, backgroundColor: color },
        style,
      ]}
    />
  );
}

// Counts from one number to another, easing out, so the new target "lands".
function useCountUp(from: number, to: number, duration = 900) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const start = Date.now();
    let frame: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setValue(from + (to - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, duration]);
  return value;
}

// Shown after a profile edit is saved: a small celebration, plus the new
// targets when the edit changed them.
export function PlanUpdatedModal({
  change,
  onClose,
}: {
  change: PlanChange;
  onClose: () => void;
}) {
  const { before, after } = change;
  const kcalDelta = after.calories - before.calories;
  const planChanged = kcalDelta !== 0 || after.proteinG !== before.proteinG;
  const kcal = useCountUp(before.calories, after.calories);

  const burst = useSharedValue(0);
  useEffect(() => {
    burst.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [burst]);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={ZoomIn.springify().damping(20).stiffness(220)}
          style={styles.card}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.avatarWrap}>
            {PIECES.map((piece, i) => (
              <Piece key={i} burst={burst} {...piece} />
            ))}
            <Animated.Image
              entering={ZoomIn.delay(120).springify().damping(9)}
              source={require('@/assets/images/kimbo-avatar.png')}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.title}>
            {planChanged ? 'Plan updated!' : 'Saved!'}
          </Text>

          {planChanged ? (
            <Animated.View
              entering={FadeInDown.delay(200)}
              style={styles.numbers}
            >
              <Text style={styles.kcal}>{n(kcal)}</Text>
              <Text style={styles.kcalLabel}>kcal a day</Text>
              {kcalDelta !== 0 && (
                <View style={[styles.delta, kcalDelta < 0 && styles.deltaDown]}>
                  <Text style={styles.deltaText}>
                    {kcalDelta > 0 ? '+' : '−'}
                    {n(Math.abs(kcalDelta))} kcal
                  </Text>
                </View>
              )}
              {after.proteinG !== before.proteinG && (
                <Text style={styles.muted}>
                  Protein {before.proteinG} g → {after.proteinG} g
                </Text>
              )}
            </Animated.View>
          ) : (
            <Animated.Text entering={FadeIn.delay(200)} style={styles.muted}>
              {change.field}: {change.value}. Your targets stay the same.
            </Animated.Text>
          )}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Nice!</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
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
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  piece: { position: 'absolute', borderRadius: 4 },
  title: { fontSize: 24, fontFamily: fonts.extraBold },
  numbers: { alignItems: 'center', gap: spacing.xs },
  kcal: { fontSize: 44, fontFamily: fonts.extraBold, color: colors.primary },
  kcalLabel: { fontSize: 15, marginTop: -6, opacity: 0.7 },
  delta: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(31, 77, 58, 0.12)',
  },
  deltaDown: { backgroundColor: 'rgba(242, 163, 58, 0.2)' },
  deltaText: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  muted: { fontSize: 15, textAlign: 'center', opacity: 0.75 },
  button: {
    alignSelf: 'stretch',
    minHeight: 48,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: { fontSize: 16, fontFamily: fonts.bold, color: colors.surface },
  pressed: { opacity: 0.8 },
});
