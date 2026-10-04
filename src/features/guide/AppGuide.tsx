import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useMMKVBoolean } from 'react-native-mmkv';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { storage } from '@/storage';
import { colors, fonts, radius, spacing } from '@/theme';

const SEEN_KEY = 'guide.seen';
const R = 44; // spotlight radius
const DIM = 1600; // the dark ring's thickness: enough to cover any screen
const KIMBO_LIFT = 64 / 3; // the centre button sits this far above the bar

// Debug builds: show the guide again (from Profile → tap the version).
export const replayGuide = () => storage.remove(SEEN_KEY);

type Target = 'home' | 'kimbo' | 'profile';
const STEPS: { target: Target; title: string; body: string }[] = [
  {
    target: 'home',
    title: 'Home is your day',
    body: 'Calories left, protein, carbs and fat, and every meal you’ve logged. Swipe left or right to see other days.',
  },
  {
    target: 'kimbo',
    title: 'Tap Kimbo to log a meal',
    body: 'Snap your plate, say it, or type it. Kimbo works out the calories, and you check them before saving.',
  },
  {
    target: 'profile',
    title: 'Profile holds your plan',
    body: 'Your details and daily targets. Change anything and your plan updates straight away.',
  },
];

export function AppGuide() {
  const [seen, setSeen] = useMMKVBoolean(SEEN_KEY, storage);
  const [step, setStep] = useState(0);
  const tabBarHeight = useBottomTabBarHeight();
  // Home stays mounted behind other tabs; only show while it's on screen.
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('screen');

  const barTop = height - tabBarHeight;
  const centre = (target: Target) => ({
    x: { home: width / 6, kimbo: width / 2, profile: (width * 5) / 6 }[target],
    y:
      target === 'kimbo'
        ? barTop - KIMBO_LIFT + 32
        : barTop + (tabBarHeight - insets.bottom) / 2,
  });

  const { x, y } = centre(STEPS[step].target);
  const cx = useSharedValue(x);
  const cy = useSharedValue(y);
  useEffect(() => {
    cx.value = withTiming(x, { duration: 320 });
    cy.value = withTiming(y, { duration: 320 });
  }, [cx, cy, x, y]);
  const spotlight = useAnimatedStyle(() => ({
    left: cx.value - R - DIM,
    top: cy.value - R - DIM,
  }));

  if (seen || !focused) return null;
  const done = () => setSeen(true);
  const last = step === STEPS.length - 1;
  const { title, body } = STEPS[step];

  return (
    <Modal
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={done}
    >
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Animated.View
          pointerEvents="none"
          style={[styles.spotlight, spotlight]}
        />

        <Animated.View
          key={step}
          entering={FadeIn.duration(250)}
          style={[styles.card, { bottom: height - y + R + spacing.lg }]}
        >
          <Text style={styles.count}>
            {step + 1} of {STEPS.length}
          </Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            {!last && (
              <Pressable
                onPress={done}
                accessibilityRole="button"
                accessibilityLabel="Skip the tour"
                style={styles.skip}
              >
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            )}
            <Pressable
              onPress={last ? done : () => setStep(step + 1)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.next, pressed && styles.pressed]}
            >
              <Text style={styles.nextText}>{last ? 'Got it' : 'Next'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  spotlight: {
    position: 'absolute',
    width: (R + DIM) * 2,
    height: (R + DIM) * 2,
    borderRadius: R + DIM,
    borderWidth: DIM,
    borderColor: 'rgba(28, 43, 36, 0.72)',
  },
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  count: { fontSize: 13, fontFamily: fonts.semiBold, opacity: 0.6 },
  title: { fontSize: 20, fontFamily: fonts.extraBold },
  body: { fontSize: 15, lineHeight: 21, opacity: 0.8 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  skip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  skipText: { fontSize: 16, fontFamily: fonts.bold, opacity: 0.6 },
  next: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  nextText: { fontSize: 16, fontFamily: fonts.bold, color: colors.surface },
  pressed: { opacity: 0.8 },
});
