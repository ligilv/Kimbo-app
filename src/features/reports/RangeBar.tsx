import { View } from 'react-native';
import { colors, themedStyles } from '@/theme';

// The usual range as a dark band on a light track, with a dot for your value.
export function RangeBar({ value, low, high }: { value: number; low: number | null; high: number | null }) {
  if (low === null && high === null) return null;
  const lo = low ?? 0;
  const hi = high ?? lo * 2;
  const span = hi - lo || 1;
  const min = Math.min(lo - span * 0.5, value);
  const max = Math.max(hi + span * 0.5, value);
  const at = (n: number) => `${((n - min) / (max - min)) * 100}%` as const;
  return (
    <View style={styles.track} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.band, { left: at(lo), width: `${((hi - lo) / (max - min)) * 100}%` }]} />
      <View style={[styles.dot, { left: at(value) }]} />
    </View>
  );
}

const styles = themedStyles(() => ({
  track: { height: 8, borderRadius: 4, backgroundColor: colors.well, marginVertical: 6 },
  band: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.line },
  dot: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.ground,
  },
}));
