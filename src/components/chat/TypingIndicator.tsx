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
import { Mascot } from '@/components/Mascot';
import { colors } from '@/theme';

function Dot({ delay }: { delay: number }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(-4, { duration: 250 }), withTiming(0, { duration: 250 })), -1),
    );
  }, [delay, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function TypingIndicator() {
  return (
    <View style={styles.row} accessible accessibilityLabel="Mira is typing" accessibilityLiveRegion="polite">
      <Mascot size={28} />
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bubble: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    backgroundColor: colors.well,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.ink, opacity: 0.6 },
});
