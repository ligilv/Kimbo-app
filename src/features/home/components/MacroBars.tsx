import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/Text';
import { colors, fonts, spacing } from '@/theme';

type Macro = { label: string; eaten: number; target: number };

function Bar({ label, eaten, target }: Macro) {
  const progress = target > 0 ? Math.min(1, eaten / target) : 0;
  const isOver = eaten > target;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(progress, { duration: 700 });
  }, [fill, progress]);
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View
      style={styles.macro}
      accessible
      accessibilityLabel={`${label}: ${Math.round(eaten)} of ${target} grams`}
    >
      <View style={styles.labels}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {Math.round(eaten)}
          <Text style={styles.target}> / {target} g</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, isOver && styles.fillOver, fillStyle]}
        />
      </View>
    </View>
  );
}

export function MacroBars({ macros }: { macros: Macro[] }) {
  return (
    <View style={styles.row}>
      {macros.map(m => (
        <Bar key={m.label} {...m} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  macro: { flex: 1, gap: 6 },
  labels: { gap: 1 },
  label: { fontSize: 13, fontFamily: fonts.semiBold, opacity: 0.7 },
  amount: { fontSize: 16, fontFamily: fonts.bold },
  target: { fontSize: 13, fontFamily: fonts.regular, opacity: 0.6 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(31, 77, 58, 0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
    transformOrigin: 'left',
  },
  fillOver: { backgroundColor: colors.accent },
});
