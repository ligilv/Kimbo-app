import { useMemo, useSyncExternalStore } from 'react';
import { type DateKey, getWeekDays } from './dates';
import {
  daySnapshot,
  getLogsForDate,
  getTotalsForDate,
  subscribeToMeals,
  totalsForLogs,
} from './mealStore';
import type { MealLog, Nutrients } from './types';

export function useDayLogs(date: DateKey): {
  logs: MealLog[];
  totals: Nutrients;
} {
  const snapshot = useSyncExternalStore(subscribeToMeals, () =>
    daySnapshot(date),
  );
  return useMemo(() => {
    const logs = snapshot ? getLogsForDate(date) : [];
    return { logs, totals: totalsForLogs(logs) };
  }, [date, snapshot]);
}

export function useWeekTotals(anchor: DateKey): Record<DateKey, Nutrients> {
  const days = useMemo(() => getWeekDays(anchor), [anchor]);
  const snapshot = useSyncExternalStore(subscribeToMeals, () =>
    days.map(daySnapshot).join('\u0000'),
  );
  return useMemo(
    () => Object.fromEntries(days.map(day => [day, getTotalsForDate(day)])),
    [days, snapshot],
  );
}
