import { useIsFocused } from '@react-navigation/native';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BottomSheet } from '@/components/BottomSheet';
import { Text } from '@/components/Text';
import { GUIDE_SEEN_KEY } from '@/features/guide/AppGuide';
import { useKimboSheet } from '@/features/kimbo/KimboSheetProvider';
import { getWeekDays, toLocalDateKey } from '@/features/meals/dates';
import { loggedDays, subscribeToMeals } from '@/features/meals/mealStore';
import { ConfettiBurst, useCountUp } from '@/features/profile/PlanUpdatedModal';
import { storage } from '@/storage';
import { colors, fonts, radius, spacing } from '@/theme';
import { computeStreak } from './streak';

const INTRO_SEEN_KEY = 'streak.introSeen';
const CELEBRATED_KEY = 'streak.celebratedOn'; // the last day the celebration showed

export function useStreak() {
  const today = toLocalDateKey(new Date());
  const snapshot = useSyncExternalStore(subscribeToMeals, () =>
    loggedDays().join(','),
  );
  return useMemo(() => {
    const logged = new Set(snapshot ? snapshot.split(',') : []);
    return { today, logged, ...computeStreak(logged, today) };
  }, [snapshot, today]);
}

const dayWord = (n: number) => (n === 1 ? 'day' : 'days');

// "🔥 3" next to the greeting. Grey until today has a meal, then orange.
export function StreakBadge() {
  const streak = useStreak();
  const [open, setOpen] = useState(false);
  if (streak.logged.size === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${streak.days} ${dayWord(streak.days)} streak${
          streak.loggedToday ? '' : ', log a meal today to keep it going'
        }`}
        style={[styles.badge, streak.loggedToday && styles.badgeOn]}
      >
        <Text style={[styles.flame, !streak.loggedToday && styles.faded]}>
          🔥
        </Text>
        <Text style={styles.badgeText}>{streak.days}</Text>
      </Pressable>
      {open && (
        <BottomSheet visible onClose={() => setOpen(false)}>
          <StreakDetails {...streak} />
        </BottomSheet>
      )}
    </>
  );
}

function StreakDetails({
  days,
  loggedToday,
  restDays,
  logged,
  today,
}: ReturnType<typeof useStreak>) {
  const week = getWeekDays(today);
  return (
    <View style={styles.details}>
      <Text style={styles.detailsTitle}>
        🔥 {days} {dayWord(days)} in a row
      </Text>
      <Text style={styles.muted}>
        {loggedToday
          ? 'Today counts. See you tomorrow!'
          : 'Log a meal today to keep it going.'}
      </Text>
      <View style={styles.week}>
        {week.map((day, i) => {
          const isRest = restDays.includes(day);
          const isLogged = logged.has(day);
          return (
            <View key={day} style={styles.weekDay}>
              <Text style={styles.weekLabel}>{'MTWTFSS'[i]}</Text>
              <View
                style={[
                  styles.dot,
                  isLogged && styles.dotLogged,
                  day === today && !isLogged && styles.dotToday,
                  day > today && styles.dotFuture,
                ]}
                accessibilityLabel={`${day}: ${
                  isLogged ? 'logged' : isRest ? 'rest day' : 'not logged'
                }`}
              >
                <Text style={styles.dotText}>
                  {isLogged ? '✓' : isRest ? '🌙' : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.muted}>
        Log at least one meal a day. Miss a day and your streak carries on:
        that’s your rest day 🌙, one each week. Miss a second day in the same
        week and it starts again.
      </Text>
    </View>
  );
}

// On Home, after the app guide: the "start a streak" invite before the first
// meal, and a celebration after the first meal of each day.
export function StreakPrompts() {
  const focused = useIsFocused();
  const streak = useStreak();
  const { openKimboSheet } = useKimboSheet();
  const [guideSeen] = useMMKVBoolean(GUIDE_SEEN_KEY, storage);
  const [introSeen, setIntroSeen] = useMMKVBoolean(INTRO_SEEN_KEY, storage);
  const [celebratedOn, setCelebratedOn] = useMMKVString(
    CELEBRATED_KEY,
    storage,
  );

  if (!focused || !guideSeen) return null;

  if (streak.logged.size === 0 && !introSeen) {
    return (
      <StreakCard
        flame="🔥"
        title="Start a streak"
        body="Log your first meal to earn your first 🔥. Keep logging each day to grow it."
        primary="Log a meal"
        onPrimary={() => {
          setIntroSeen(true);
          openKimboSheet();
        }}
        secondary="Maybe later"
        onClose={() => setIntroSeen(true)}
      />
    );
  }

  if (streak.loggedToday && celebratedOn !== streak.today) {
    return (
      <Celebration
        days={streak.days}
        onClose={() => setCelebratedOn(streak.today)}
      />
    );
  }
  return null;
}

function Celebration({ days, onClose }: { days: number; onClose: () => void }) {
  const count = useCountUp(Math.max(0, days - 1), days);
  return (
    <StreakCard
      flame="🔥"
      number={Math.round(count)}
      title={days === 1 ? 'Your streak has started!' : `${days} days in a row!`}
      body={
        days === 1
          ? 'Log a meal tomorrow to make it 2.'
          : 'Nice work. Keep it going tomorrow.'
      }
      primary="Nice!"
      onPrimary={onClose}
      onClose={onClose}
      confetti
    />
  );
}

function StreakCard(props: {
  flame: string;
  number?: number;
  title: string;
  body: string;
  primary: string;
  onPrimary: () => void;
  secondary?: string;
  onClose: () => void;
  confetti?: boolean;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          entering={ZoomIn.springify().damping(20).stiffness(220)}
          style={styles.card}
          accessibilityViewIsModal
        >
          <View style={styles.flameWrap}>
            {props.confetti && <ConfettiBurst />}
            <Animated.Text
              entering={ZoomIn.delay(120).springify().damping(9)}
              style={styles.bigFlame}
            >
              {props.flame}
            </Animated.Text>
          </View>
          {props.number !== undefined && (
            <Text style={styles.number}>{props.number}</Text>
          )}
          <Text style={styles.title}>{props.title}</Text>
          <Text style={styles.body}>{props.body}</Text>
          <Pressable
            onPress={props.onPrimary}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{props.primary}</Text>
          </Pressable>
          {props.secondary && (
            <Pressable
              onPress={props.onClose}
              accessibilityRole="button"
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>{props.secondary}</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(28, 43, 36, 0.06)',
  },
  badgeOn: { backgroundColor: 'rgba(242, 163, 58, 0.22)' },
  flame: { fontSize: 18 },
  faded: { opacity: 0.35 },
  badgeText: { fontSize: 16, fontFamily: fonts.extraBold },
  details: { gap: spacing.md },
  detailsTitle: { fontSize: 22, fontFamily: fonts.extraBold },
  muted: { fontSize: 15, lineHeight: 21, opacity: 0.75 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: spacing.xs },
  weekLabel: { fontSize: 13, fontFamily: fonts.semiBold, opacity: 0.6 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 43, 36, 0.08)',
  },
  dotLogged: { backgroundColor: colors.primary },
  dotToday: { borderWidth: 2, borderColor: colors.accent },
  dotFuture: { opacity: 0.4 },
  dotText: { fontSize: 15, fontFamily: fonts.bold, color: colors.surface },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 43, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  flameWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigFlame: { fontSize: 64 },
  number: { fontSize: 44, fontFamily: fonts.extraBold, color: colors.accent },
  title: { fontSize: 22, fontFamily: fonts.extraBold, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, opacity: 0.8, textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    minHeight: 48,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: { fontSize: 16, fontFamily: fonts.bold, color: colors.surface },
  secondary: { minHeight: 44, justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontFamily: fonts.bold, opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
