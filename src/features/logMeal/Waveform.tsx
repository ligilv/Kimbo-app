import { View } from 'react-native';
import { colors, spacing, themedStyles } from '@/theme';

const MAX_HEIGHT = 28;

// Live mic loudness while the user talks: newest bar on the right, ~10 per second.
export function Waveform({ levels }: { levels: number[] }) {
  return (
    <View
      style={styles.row}
      accessibilityLabel="Listening"
      accessibilityRole="progressbar"
    >
      {levels.map((level, i) => (
        <View
          key={i}
          style={[styles.bar, { height: 3 + level * (MAX_HEIGHT - 3) }]}
        />
      ))}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    height: MAX_HEIGHT + spacing.sm * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.ground,
  },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.ink },
}));
