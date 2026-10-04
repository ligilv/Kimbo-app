import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Directions,
  GestureDetector,
  useCompetingGestures,
  useFlingGesture,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { CalorieRing, ringLabel } from '@/features/home/components/CalorieRing';
import { EditItemSheet } from '@/features/home/components/EditItemSheet';
import { MacroBars } from '@/features/home/components/MacroBars';
import { MealsList } from '@/features/home/components/MealsList';
import { TargetExplanationSheet } from '@/features/home/components/TargetExplanationSheet';
import { AppGuide } from '@/features/guide/AppGuide';
import { WeekStrip } from '@/features/home/components/WeekStrip';
import { getNudge, getWelcomePlan } from '@/features/home/nudge';
import { StreakBadge, StreakPrompts } from '@/features/streak/StreakUI';
import { WaterCard } from '@/features/water/WaterCard';
import { waterTargetMl } from '@/features/water/water';
import { useKimboSheet } from '@/features/kimbo/KimboSheetProvider';
import {
  addDays,
  type DateKey,
  isEditableDay,
  formatDayLabel,
  formatShortDate,
  toLocalDateKey,
} from '@/features/meals/dates';
import type { FoodItem, MealLog } from '@/features/meals/types';
import {
  useDayLogs,
  useHasAnyLogs,
  useWeekTotals,
} from '@/features/meals/useMeals';
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
  const [answers] = useAnswers();
  const today = toLocalDateKey(new Date());
  // Shared with the Kimbo tab button, so logging goes to the day on screen.
  const {
    selectedDate: selected,
    setSelectedDate: setSelected,
    openKimboSheet,
  } = useKimboSheet();
  const [explaining, setExplaining] = useState(false);
  const [editing, setEditing] = useState<{
    log: MealLog;
    item: FoodItem;
  } | null>(null);

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
  const hasAnyLogs = useHasAnyLogs();
  const welcome =
    profile && targets && !hasAnyLogs ? getWelcomePlan(profile, targets) : null;
  const nudge =
    profile && targets && hasAnyLogs
      ? getNudge(totals, targets, new Date(), {
          isToday: isTodaySelected,
          diet: profile.diet,
        })
      : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.greeting}>Hi, {displayName(answers)}</Text>
          <Text style={styles.dateLabel}>{headerDate(selected)}</Text>
        </View>
        <StreakBadge />
        {!isTodaySelected && (
          <Pressable
            onPress={() => setSelected(today)}
            accessibilityRole="button"
            style={styles.todayChip}
          >
            <Text style={styles.todayChipText}>Back to today</Text>
          </Pressable>
        )}
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
        {hasAnyLogs && (
          <Pressable
            onPress={() => navigation.navigate('Progress')}
            accessibilityRole="link"
            style={styles.progressLink}
          >
            <Text style={styles.progressLinkText}>Your progress →</Text>
          </Pressable>
        )}
      </View>

      <GestureDetector gesture={swipe}>
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.body,
              // Clears the raised Kimbo button that overlaps the top of the tab bar.
              { paddingBottom: spacing.xl * 2 },
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

            {welcome ? (
              <View style={styles.card}>
                <View style={styles.nudge}>
                  <Image
                    source={require('@/assets/images/kimbo-avatar.png')}
                    style={styles.nudgeAvatar}
                    accessibilityIgnoresInvertColors
                  />
                  <Text style={styles.welcomeTitle}>{welcome.title}</Text>
                </View>
                <View style={styles.welcomeBody}>
                  <Text style={styles.welcomeGoal}>{welcome.goal}</Text>
                  <Text style={styles.muted}>{welcome.reason}</Text>
                </View>
                <Pressable
                  onPress={() => openKimboSheet()}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.welcomeButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.welcomeButtonText}>
                    Log your first meal
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {nudge && (
              <Pressable
                onPress={
                  nudge.slot ? () => openKimboSheet(nudge.slot) : undefined
                }
                disabled={!nudge.slot}
                accessibilityRole={nudge.slot ? 'button' : 'text'}
                accessibilityHint={
                  nudge.slot ? 'Opens meal logging' : undefined
                }
                style={({ pressed }) => [
                  styles.card,
                  styles.nudge,
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={require('@/assets/images/kimbo-avatar.png')}
                  style={styles.nudgeAvatar}
                  accessibilityIgnoresInvertColors
                />
                <Text style={styles.nudgeText}>{nudge.text}</Text>
              </Pressable>
            )}

            {profile && (
              <WaterCard
                date={selected}
                targetMl={waterTargetMl(profile.weightKg)}
                locked={!isEditableDay(selected, today)}
              />
            )}

            {!isEditableDay(selected, today) && (
              <Text style={styles.lockedNote}>
                🔒 Past days are locked. Kimbo logs to today.
              </Text>
            )}
            <MealsList
              logs={logs}
              locked={!isEditableDay(selected, today)}
              onAddToSlot={openKimboSheet}
              onEditItem={(log, item) => setEditing({ log, item })}
            />
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
            navigation.navigate('MainTabs', { screen: 'Profile' });
          }}
        />
      )}

      <AppGuide />
      <StreakPrompts />

      {editing && (
        <EditItemSheet
          key={editing.item.id}
          log={editing.log}
          item={editing.item}
          onClose={() => setEditing(null)}
        />
      )}
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
    minHeight: 44,
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
  weekStrip: { paddingHorizontal: spacing.sm, paddingTop: spacing.md },
  lockedNote: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
  progressLink: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  progressLinkText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nudgeAvatar: { width: 40, height: 40, borderRadius: 20 },
  nudgeText: { flex: 1, fontSize: 15, fontFamily: fonts.semiBold },
  welcomeTitle: { flex: 1, fontSize: 18, fontFamily: fonts.extraBold },
  welcomeBody: { gap: spacing.xs },
  welcomeGoal: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  welcomeButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  welcomeButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.surface,
  },
  muted: { fontSize: 15, fontFamily: fonts.regular, opacity: 0.7 },
  pressed: { opacity: 0.8 },
});
