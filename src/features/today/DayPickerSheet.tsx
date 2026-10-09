import Check from 'lucide-react-native/icons/check';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Text } from '@/components/Text';
import { addDays, type DateKey, formatDayLabel } from '@/features/meals/dates';
import { formatKcal } from '@/features/meals/format';
import { getTotalsForDate } from '@/features/meals/mealStore';
import { colors, fonts, spacing, themedStyles } from '@/theme';

const DAYS = 14;

// Earlier days, newest first. No calendar widget: two weeks back is what people look at.
export function DayPickerSheet({
  today,
  selected,
  onPick,
  onClose,
}: {
  today: DateKey;
  selected: DateKey;
  onPick: (date: DateKey) => void;
  onClose: () => void;
}) {
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, -i));
  return (
    <BottomSheet visible onClose={onClose}>
      <Text style={styles.title}>Earlier days</Text>
      <ScrollView style={styles.list}>
        {days.map(day => {
          const kcal = getTotalsForDate(day).kcal;
          return (
            <Pressable
              key={day}
              onPress={() => onPick(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: day === selected }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.day}>{formatDayLabel(day, new Date())}</Text>
              <Text style={styles.kcal}>{kcal > 0 ? formatKcal(kcal) : 'Nothing logged'}</Text>
              <View style={styles.check}>{day === selected && <Check size={18} color={colors.ink} />}</View>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  title: { fontSize: 20, fontFamily: fonts.extraBold, marginBottom: spacing.sm },
  list: { maxHeight: 480 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  day: { flex: 1, fontSize: 16, fontFamily: fonts.semiBold },
  kcal: { fontSize: 14, color: colors.muted },
  check: { width: 32, alignItems: 'flex-end' },
  pressed: { opacity: 0.6 },
}));
