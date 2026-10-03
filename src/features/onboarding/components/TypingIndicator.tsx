import LottieView from 'lottie-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';

function Dot({ delay }: { delay: number }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 250 }),
          withTiming(0, { duration: 250 }),
        ),
        -1,
      ),
    );
  }, [delay, lift]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

// Kimbo's avatar spins (the loader animation) while three dots bounce.
export function TypingIndicator() {
  return (
    <View style={styles.row} accessibilityLabel="Kimbo is typing">
      <View style={styles.avatar}>
        <LottieView
          source={require('@/assets/lottie/kimbo_loader_light_bg.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: { width: 40, height: 40 },
  bubble: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
});
