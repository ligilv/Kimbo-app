import Moon from 'lucide-react-native/icons/moon';
import Sun from 'lucide-react-native/icons/sun';
import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { paletteFor } from '@/theme';
import {
  clearPendingSwitch,
  getPendingSwitch,
  type Switch,
  subscribeToSwitch,
} from './appearance';

const IN_MS = 180;
const SWAP_MS = 420;
const HOLD_MS = 120;
const OUT_MS = 260;

// Full-screen cover for an appearance switch: it fades in in the old colours,
// the background turns to the new one while the sun turns into the moon (or
// back), then it fades out on the redrawn app. Sits above everything, outside
// the part of the tree that gets rebuilt.
export function AppearanceTransition() {
  const current = useSyncExternalStore(subscribeToSwitch, getPendingSwitch);
  return current ? <Cover key={`${current.from}-${current.to}`} change={current} /> : null;
}

function Cover({ change }: { change: Switch }) {
  const from = paletteFor(change.from);
  const to = paletteFor(change.to);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(0); // 0 = old colours, 1 = new

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: IN_MS }),
      withDelay(SWAP_MS + HOLD_MS, withTiming(0, { duration: OUT_MS }, done => {
        if (done) scheduleOnRN(clearPendingSwitch);
      })),
    );
    progress.value = withDelay(
      IN_MS,
      withTiming(1, { duration: SWAP_MS }, done => {
        // Save the new appearance only once the screen is fully covered.
        if (done) scheduleOnRN(change.commit);
      }),
    );
  }, [change, opacity, progress]);

  const cover = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: interpolateColor(progress.value, [0, 1], [from.ground, to.ground]),
  }));
  // The old icon turns away and fades as the new one turns in.
  const oldIcon = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ rotate: `${progress.value * 90}deg` }, { scale: 1 - progress.value * 0.4 }],
  }));
  const newIcon = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ rotate: `${(progress.value - 1) * 90}deg` }, { scale: 0.6 + progress.value * 0.4 }],
  }));

  const icon = (scheme: Switch['to'], color: string) =>
    scheme === 'dark' ? (
      <Moon size={72} color={color} strokeWidth={1.6} />
    ) : (
      <Sun size={72} color={color} strokeWidth={1.6} />
    );

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.center, cover]}
      pointerEvents="auto" // blocks taps until the switch is done
      accessibilityLiveRegion="polite"
      accessibilityLabel={change.to === 'dark' ? 'Switching to dark' : 'Switching to light'}
    >
      <Animated.View style={[styles.icon, oldIcon]}>{icon(change.from, from.ink)}</Animated.View>
      <Animated.View style={[styles.icon, newIcon]}>{icon(change.to, to.ink)}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  icon: { position: 'absolute' },
});
