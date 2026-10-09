import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { formatTime, fromMinutes, toMinutes } from '@/engine/time';
import { colors, fonts, radius } from '@/theme';

const STEP_MIN = 15;

// "Breakfast   −  8:30 am  +" — no clock picker, just 15-minute nudges.
export function TimeStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
}) {
  const nudge = (by: number) => onChange(fromMinutes(toMinutes(value) + by));
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => nudge(-STEP_MIN)}
        accessibilityRole="button"
        accessibilityLabel={`${label} 15 minutes earlier`}
        style={styles.button}
      >
        <Minus size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.time} accessibilityLabel={`${label} at ${formatTime(value)}`}>
        {formatTime(value)}
      </Text>
      <Pressable
        onPress={() => nudge(STEP_MIN)}
        accessibilityRole="button"
        accessibilityLabel={`${label} 15 minutes later`}
        style={styles.button}
      >
        <Plus size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingLeft: 16,
    minHeight: 52,
  },
  label: { flex: 1, fontSize: 16, fontFamily: fonts.semiBold },
  button: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 16, fontFamily: fonts.bold, minWidth: 76, textAlign: 'center' },
});
