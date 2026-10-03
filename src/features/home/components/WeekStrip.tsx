import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { ProgressRing } from '@/components/ProgressRing';
import { Text } from '@/components/Text';
import {
  type DateKey,
  formatDayLabel,
  fromDateKey,
  getWeekDays,
} from '@/features/meals/dates';
import type { Nutrients } from '@/features/meals/types';
import { colors, fonts, radius, spacing } from '@/theme';

const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  selected: DateKey;
  today: DateKey;
  totals: Record<DateKey, Nutrients>;
  targetKcal: number;
  onSelect: (day: DateKey) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export function WeekStrip({
  selected,
  today,
  totals,
  targetKcal,
  onSelect,
  onPrevWeek,
  onNextWeek,
}: Props) {
  const days = getWeekDays(selected);
  const isCurrentWeek = days.includes(today);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrevWeek}
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        style={styles.arrow}
      >
        <ChevronLeft size={22} color={colors.primary} />
      </Pressable>

      {days.map(day => {
        const isSelected = day === selected;
        const isFuture = day > today;
        const kcal = totals[day]?.kcal ?? 0;
        const progress = targetKcal > 0 ? kcal / targetKcal : 0;
        const date = fromDateKey(day);
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            disabled={isFuture}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isFuture }}
            accessibilityLabel={`${formatDayLabel(day)}${
              isFuture ? '' : `, ${Math.round(kcal)} of ${targetKcal} kcal`
            }`}
            style={[
              styles.pill,
              day === today && !isSelected && styles.pillToday,
              isSelected && styles.pillSelected,
              isFuture && styles.pillFuture,
            ]}
          >
            <Text style={[styles.initial, isSelected && styles.textSelected]}>
              {INITIALS[date.getDay()]}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.textSelected]}>
              {date.getDate()}
            </Text>
            <ProgressRing
              size={18}
              strokeWidth={3}
              progress={isFuture ? 0 : progress}
              // Over target is shown in turmeric: noticeable, never alarming red.
              color={
                progress > 1
                  ? colors.accent
                  : isSelected
                  ? colors.background
                  : colors.primary
              }
              trackColor={
                isSelected
                  ? 'rgba(246, 239, 226, 0.3)'
                  : 'rgba(31, 77, 58, 0.15)'
              }
            />
          </Pressable>
        );
      })}

      <Pressable
        onPress={onNextWeek}
        disabled={isCurrentWeek}
        accessibilityRole="button"
        accessibilityLabel="Next week"
        accessibilityState={{ disabled: isCurrentWeek }}
        style={[styles.arrow, isCurrentWeek && styles.arrowDisabled]}
      >
        <ChevronRight size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  arrow: {
    width: 32,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: { opacity: 0.25 },
  pill: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillToday: { borderColor: colors.primary },
  pillSelected: { backgroundColor: colors.primary },
  pillFuture: { opacity: 0.35 },
  initial: { fontSize: 12, fontFamily: fonts.semiBold, opacity: 0.7 },
  dayNumber: { fontSize: 16, fontFamily: fonts.bold },
  textSelected: { color: colors.background, opacity: 1 },
});
