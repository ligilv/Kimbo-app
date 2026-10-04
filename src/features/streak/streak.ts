import { addDays, type DateKey, getWeekDays } from '@/features/meals/dates';

export type Streak = {
  days: number; // days with at least one meal in the current run
  loggedToday: boolean;
  restDays: DateKey[]; // missed days the run forgave (at most one per Mon–Sun week)
};

// Worked out from the days that have meals, never stored, so deleting a day's
// only meal corrects it. Today not logged yet doesn't break the run (the day
// isn't over). One missed day per week is forgiven as a rest day; a second
// missed day in the same week ends the run.
export function computeStreak(logged: Set<DateKey>, today: DateKey): Streak {
  const loggedToday = logged.has(today);
  const first = [...logged].sort()[0];
  let days = 0;
  let earliestCounted: DateKey | undefined;
  const restWeeks = new Set<DateKey>();
  const restDays: DateKey[] = [];

  if (first) {
    for (
      let day = loggedToday ? today : addDays(today, -1);
      day >= first;
      day = addDays(day, -1)
    ) {
      if (logged.has(day)) {
        days += 1;
        earliestCounted = day;
        continue;
      }
      const week = getWeekDays(day)[0];
      if (restWeeks.has(week)) break;
      restWeeks.add(week);
      restDays.push(day);
    }
  }

  return {
    days,
    loggedToday,
    // A rest day only counts if logged days sit on both sides of it.
    restDays: restDays.filter(d => earliestCounted && d > earliestCounted),
  };
}
