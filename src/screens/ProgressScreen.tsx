import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { addDays, fromDateKey, toLocalDateKey } from '@/features/meals/dates';
import {
  daySnapshot,
  getLogsForDate,
  subscribeToMeals,
} from '@/features/meals/mealStore';
import { isComplete, targetsFor } from '@/features/onboarding/script';
import { useAnswers } from '@/features/onboarding/useOnboarding';
import { useInsight } from '@/features/progress/insight';
import {
  type Range,
  summarize,
  type Summary,
} from '@/features/progress/summary';
import { useStreak } from '@/features/streak/StreakUI';
import type { Profile } from '@/features/onboarding/types';
import type { Targets } from '@/features/onboarding/targets';
import { colors, fonts, radius, spacing } from '@/theme';

const n = (value: number) => Math.round(value).toLocaleString('en-IN');
const BAR_AREA = 120;

export function ProgressScreen() {
  const navigation = useNavigation();
  const [answers] = useAnswers();
  const [range, setRange] = useState<Range>(7);
  const today = toLocalDateKey(new Date());

  // Re-summarise whenever any of the last 30 days changes.
  const snapshot = useSyncExternalStore(subscribeToMeals, () =>
    Array.from({ length: 30 }, (_, i) => daySnapshot(addDays(today, -i))).join(
      '\u0000',
    ),
  );
  const profile = isComplete(answers) ? answers : null;
  const targets = profile ? targetsFor(profile) : null;
  // snapshot is a dependency only so a logged meal re-runs the summary.
  const summary = useMemo(() => {
    const p = isComplete(answers) ? answers : null;
    return p && snapshot !== null
      ? summarize(getLogsForDate, targetsFor(p), today, range)
      : null;
  }, [snapshot, answers, today, range]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Your progress</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.toggle} accessibilityRole="tablist">
          {([7, 30] as const).map(r => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              accessibilityRole="tab"
              accessibilityState={{ selected: range === r }}
              style={[styles.toggleItem, range === r && styles.toggleOn]}
            >
              <Text
                style={[styles.toggleText, range === r && styles.toggleTextOn]}
              >
                Last {r} days
              </Text>
            </Pressable>
          ))}
        </View>

        {summary && profile && targets && (
          <Content summary={summary} profile={profile} targets={targets} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Content({
  summary: s,
  profile,
  targets,
}: {
  summary: Summary;
  profile: Profile;
  targets: Targets;
}) {
  const insight = useInsight(s, profile, targets);
  const streak = useStreak();
  const outOf = (count: number) => `${count} of ${s.daysLogged} days`;

  return (
    <>
      <View style={[styles.card, styles.insight]}>
        <Image
          source={require('@/assets/images/kimbo-avatar.png')}
          style={styles.avatar}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.flex}>
          <View style={styles.insightLabelRow}>
            <Text style={styles.cardLabel}>Kimbo’s take</Text>
            {insight.loading && <ActivityIndicator size="small" />}
          </View>
          <Text
            style={[styles.insightText, insight.loading && styles.faded]}
            accessibilityLiveRegion="polite"
          >
            {insight.text}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Stat
          label="Average a day"
          value={`${n(s.avgKcal)} kcal`}
          sub={`target ${n(targets.calories)}`}
        />
        <Stat
          label="On target"
          value={outOf(s.onTargetDays)}
          sub="within 10% of calories"
        />
        <Stat
          label="Average protein"
          value={`${s.avgProtein} g`}
          sub={`target ${targets.proteinG} g`}
        />
        <Stat
          label="Protein hit"
          value={outOf(s.proteinHitDays)}
          sub={`${targets.proteinG} g or more`}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Calories each day</Text>
        <Bars days={s.days} target={targets.calories} />
        <Text style={styles.muted}>
          Logged {s.daysLogged} of {s.range} days · 🔥 {streak.days}{' '}
          {streak.days === 1 ? 'day' : 'days'} streak
        </Text>
      </View>

      {s.topFoods.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>What you log most</Text>
          {s.topFoods.slice(0, 5).map(food => (
            <View key={food.name} style={styles.foodRow}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.muted}>×{food.count}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={[styles.card, styles.stat]} accessible>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

// One bar per day, green up to the target (+10%), turmeric above it. The line
// marks the target. Empty days show a small grey stub.
function Bars({ days, target }: { days: Summary['days']; target: number }) {
  const top = Math.max(target * 1.2, ...days.map(d => d.kcal));
  const showLabels = days.length <= 7;
  return (
    <View>
      <View style={styles.bars}>
        <View
          style={[styles.targetLine, { bottom: (target / top) * BAR_AREA }]}
        />
        {days.map(d => (
          <View
            key={d.date}
            style={styles.barSlot}
            accessible
            accessibilityLabel={`${d.date}: ${
              d.logged ? `${n(d.kcal)} kcal` : 'nothing logged'
            }`}
          >
            <View
              style={[
                styles.bar,
                showLabels ? styles.barWide : styles.barThin,
                d.logged
                  ? {
                      height: Math.max(4, (d.kcal / top) * BAR_AREA),
                      backgroundColor:
                        d.kcal > target * 1.1 ? colors.accent : colors.primary,
                    }
                  : styles.barEmpty,
              ]}
            />
          </View>
        ))}
      </View>
      {showLabels && (
        <View style={styles.labels}>
          {days.map(d => (
            <Text key={d.date} style={styles.barLabel}>
              {fromDateKey(d.date).toLocaleDateString('en-IN', {
                weekday: 'narrow',
              })}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontFamily: fonts.extraBold },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 77, 58, 0.1)',
    borderRadius: radius.pill,
    padding: 4,
  },
  toggleItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleText: { fontSize: 15, fontFamily: fonts.bold, color: colors.primary },
  toggleTextOn: { color: colors.surface },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: { fontSize: 13, fontFamily: fonts.semiBold, opacity: 0.6 },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  insightLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightText: { fontSize: 16, lineHeight: 23, marginTop: 2 },
  faded: { opacity: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  statValue: {
    fontSize: 20,
    fontFamily: fonts.extraBold,
    color: colors.primary,
  },
  statSub: { fontSize: 13, opacity: 0.6 },
  bars: {
    height: BAR_AREA,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { borderRadius: 4 },
  barWide: { width: 22 },
  barThin: { width: 6 },
  barEmpty: { height: 4, backgroundColor: 'rgba(28, 43, 36, 0.12)' },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(28, 43, 36, 0.35)',
  },
  labels: { flexDirection: 'row', marginTop: spacing.xs },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 12, opacity: 0.6 },
  muted: { fontSize: 14, opacity: 0.7 },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
    alignItems: 'center',
  },
  foodName: { fontSize: 16, fontFamily: fonts.semiBold },
});
