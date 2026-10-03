import { useNavigation } from '@react-navigation/native';
import { UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Directions,
  GestureDetector,
  useCompetingGestures,
  useFlingGesture,
} from 'react-native-gesture-handler';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { CalorieRing, ringLabel } from '@/features/home/components/CalorieRing';
import { MacroBars } from '@/features/home/components/MacroBars';
import { TargetExplanationSheet } from '@/features/home/components/TargetExplanationSheet';
import { WeekStrip } from '@/features/home/components/WeekStrip';
import {
  addDays,
  type DateKey,
  formatDayLabel,
  formatShortDate,
  toLocalDateKey,
} from '@/features/meals/dates';
import { MEAL_SLOTS } from '@/features/meals/types';
import { useDayLogs, useWeekTotals } from '@/features/meals/useMeals';
import {
  displayName,
  isComplete,
  targetsFor,
} from '@/features/onboarding/script';
import { useAnswers } from '@/features/onboarding/useOnboarding';
import { colors, fonts, radius, spacing } from '@/theme';

// "Today · Sun, 4 Oct", or just "Fri, 2 Oct" for older days.
const headerDate = (key: DateKey) => {
  const label = formatDayLabel(key);
  const date = formatShortDate(key);
  return label === date ? date : `${label} · ${date}`;
};

export function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [answers] = useAnswers();
  const today = toLocalDateKey(new Date());
  const [selected, setSelected] = useState(today);
  const [explaining, setExplaining] = useState(false);

  const { logs, totals } = useDayLogs(selected);
  const weekTotals = useWeekTotals(selected);
  // Home is only reachable after onboarding, so the profile is complete here.
  const profile = isComplete(answers) ? answers : null;
  const targets = profile ? targetsFor(profile) : null;
  const targetKcal = targets?.calories ?? 0;

  // Never step into the future.
  const go = (day: DateKey) => setSelected(day > today ? today : day);

  // Swipe left for the next day, right for the previous one.
  const swipeNext = useFlingGesture({
    direction: Directions.LEFT,
    runOnJS: true,
    onActivate: () => go(addDays(selected, 1)),
  });
  const swipePrev = useFlingGesture({
    direction: Directions.RIGHT,
    runOnJS: true,
    onActivate: () => go(addDays(selected, -1)),
  });
  const swipe = useCompetingGestures(swipeNext, swipePrev);

  const isTodaySelected = selected === today;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.greeting}>Hi, {displayName(answers)}</Text>
          <Text style={styles.dateLabel}>{headerDate(selected)}</Text>
        </View>
        {!isTodaySelected && (
          <Pressable
            onPress={() => setSelected(today)}
            accessibilityRole="button"
            style={styles.todayChip}
          >
            <Text style={styles.todayChipText}>Back to today</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          style={styles.profileButton}
        >
          <UserRound size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekStrip}>
        <WeekStrip
          selected={selected}
          today={today}
          totals={weekTotals}
          targetKcal={targetKcal}
          onSelect={go}
          onPrevWeek={() => go(addDays(selected, -7))}
          onNextWeek={() => go(addDays(selected, 7))}
        />
      </View>

      <GestureDetector gesture={swipe}>
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.body,
              { paddingBottom: 96 + insets.bottom },
            ]}
          >
            {targets && (
              <View style={styles.card}>
                <Pressable
                  onPress={() => setExplaining(true)}
                  accessibilityRole="button"
                  accessibilityLabel={ringLabel(
                    totals.kcal,
                    targetKcal,
                    isTodaySelected,
                  )}
                  accessibilityHint="Shows how your daily target is worked out"
                >
                  <CalorieRing
                    eaten={totals.kcal}
                    target={targetKcal}
                    isToday={isTodaySelected}
                  />
                </Pressable>
                <MacroBars
                  macros={[
                    {
                      label: 'Protein',
                      eaten: totals.protein,
                      target: targets.proteinG,
                    },
                    {
                      label: 'Carbs',
                      eaten: totals.carbs,
                      target: targets.carbsG,
                    },
                    { label: 'Fat', eaten: totals.fat, target: targets.fatG },
                  ]}
                />
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Kimbo nudge · Phase 6</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Meals · Phase 4</Text>
              {MEAL_SLOTS.map(slot => {
                const meals = logs.filter(log => log.slot === slot);
                return (
                  <Text key={slot} style={styles.mealLine}>
                    <Text style={styles.slotName}>{slot}: </Text>
                    {meals.length
                      ? meals.map(m => m.rawText).join(', ')
                      : 'nothing yet'}
                  </Text>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </GestureDetector>

      {profile && targets && (
        <TargetExplanationSheet
          visible={explaining}
          onClose={() => setExplaining(false)}
          profile={profile}
          targets={targets}
          onEditProfile={() => {
            setExplaining(false);
            navigation.navigate('Profile');
          }}
        />
      )}

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Pressable
          onPress={() => navigation.navigate('LogMeal', { date: selected })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Log a meal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  greeting: { fontSize: 24, fontFamily: fonts.extraBold },
  dateLabel: { fontSize: 15, opacity: 0.7, marginTop: 2 },
  todayChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(31, 77, 58, 0.1)',
  },
  todayChipText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardLabel: { fontSize: 13, fontFamily: fonts.semiBold, opacity: 0.6 },
  muted: { fontSize: 15, fontFamily: fonts.regular, opacity: 0.7 },
  mealLine: { fontSize: 15 },
  slotName: { fontFamily: fonts.semiBold, textTransform: 'capitalize' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontFamily: fonts.bold, color: colors.text },
  pressed: { opacity: 0.8 },
});
