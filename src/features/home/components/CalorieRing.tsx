import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const kcal = (n: number) => Math.round(n).toLocaleString('en-IN');

type Props = {
  eaten: number;
  target: number;
  isToday: boolean;
};

export function CalorieRing({ eaten, target, isToday }: Props) {
  const over = Math.max(0, eaten - target);
  const isOver = over > 0;
  const progress = target > 0 ? Math.min(1, eaten / target) : 0;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(progress, { duration: 700 });
  }, [fill, progress]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - fill.value),
  }));

  const [number, caption] = isOver
    ? [kcal(over), 'kcal over']
    : isToday
    ? [kcal(target - eaten), 'kcal left']
    : [kcal(eaten), 'kcal eaten'];

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="rgba(31, 77, 58, 0.12)"
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={isOver ? colors.accent : colors.primary}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          fill="none"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.number}>{number}</Text>
        <Text style={styles.caption}>{caption}</Text>
        <Text style={styles.subtext}>of {kcal(target)} kcal</Text>
      </View>
    </View>
  );
}

// What a screen reader says for the ring.
export function ringLabel(eaten: number, target: number, isToday: boolean) {
  const over = eaten - target;
  if (over > 0)
    return `${kcal(eaten)} kcal eaten, ${kcal(over)} over your ${kcal(
      target,
    )} kcal target`;
  return isToday
    ? `${kcal(target - eaten)} of ${kcal(target)} kcal left today, ${kcal(
        eaten,
      )} eaten`
    : `${kcal(eaten)} of ${kcal(target)} kcal eaten`;
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  centre: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontSize: 36, lineHeight: 42, fontFamily: fonts.extraBold },
  caption: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.primary },
  subtext: { fontSize: 13, opacity: 0.6, marginTop: 2 },
});
