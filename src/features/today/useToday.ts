import { useEffect, useState } from 'react';
import { nextAction } from '@/engine/nextAction';
import { useDayState } from '@/features/day/dayState';
import { type DateKey, toLocalDateKey } from '@/features/meals/dates';
import { getLogsForDate, getTotalsForDate } from '@/features/meals/mealStore';
import { useDayLogs, useHasAnyLogs } from '@/features/meals/useMeals';
import { isDueOn, useDoses, useMedicines } from '@/features/medicines/medicineStore';
import { displayName, targetsFor } from '@/features/onboarding/script';
import { DEFAULT_MEAL_TIMES, type Profile } from '@/features/onboarding/types';
import { dueFollowups, flagged, latestReport, useFollowups, useReports } from '@/features/reports/reportStore';
import { buildFeed, laterToday } from './feed';
import { milestonesFor, streakLine } from './milestones';

// Re-renders once a minute so "late" and meal windows move with the clock.
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function useToday(profile: Profile, date: DateKey) {
  const now = useNow();
  const today = toLocalDateKey(now);
  const isToday = date === today;
  const { logs, totals } = useDayLogs(date);
  const day = useDayState(date);
  const medicines = useMedicines().filter(m => isDueOn(m, date));
  const doses = useDoses(date);
  const followups = useFollowups();
  const reports = useReports();
  const hasAnyLogs = useHasAnyLogs();
  const targets = targetsFor(profile);
  const mealTimes = profile.mealTimes ?? DEFAULT_MEAL_TIMES;

  const latest = latestReport(reports);
  const flaggedCount = latest ? flagged(latest).length : 0;
  const openFollowups = dueFollowups(followups, now);

  const action = isToday
    ? nextAction({
        now,
        routine: mealTimes,
        loggedSlots: logs.map(l => l.slot),
        medicines: medicines.map(m => ({ ...m, handled: !!doses[m.id] })),
        openFollowups,
        dismissed: Object.keys(day.handled),
        snoozedUntil: day.snoozedUntil,
        targets: { calories: targets.calories, proteinG: targets.proteinG },
        totals,
        diet: profile.diet,
        firstTime: !hasAnyLogs,
      })
    : undefined;

  // Past days are read straight from storage; only the day on screen changes live.
  const hasMeals = (d: DateKey) => getLogsForDate(d).length > 0;
  const times = logs.map(l => l.createdAt).sort();
  const milestones = milestonesFor({
    date,
    hasMeals,
    kcalOn: d => getTotalsForDate(d).kcal,
    targetKcal: targets.calories,
    firstMealAt: times[0],
    lastMealAt: times.at(-1),
    medicinesDue: medicines.length,
    dosesTaken: medicines.flatMap(m => (doses[m.id]?.status === 'taken' ? [doses[m.id]] : [])),
  });

  const feed = buildFeed({
    date,
    isToday,
    now,
    name: displayName(profile),
    diet: profile.diet,
    logs,
    day,
    medicines,
    doses,
    followups,
    flaggedSummary:
      latest && flaggedCount > 0 && openFollowups.length > 0
        ? `${flaggedCount} of ${latest.values.length} values need attention`
        : undefined,
    proteinTarget: targets.proteinG,
    streakLine: isToday ? streakLine(today, hasMeals) : undefined,
    milestones,
    action,
  });

  const later = isToday
    ? laterToday({
        now,
        mealTimes,
        loggedSlots: logs.map(l => l.slot),
        handled: Object.keys(day.handled),
        medicines,
        doses,
        actionId: action?.id,
      })
    : [];

  return { now, today, isToday, logs, totals, targets, action, feed, mealTimes, later };
}
