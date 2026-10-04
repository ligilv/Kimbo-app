import { useMemo, useSyncExternalStore } from 'react';
import { type DateKey, getWeekDays } from './dates';
import {
  daySnapshot,
  getLogsForDate,
  hasAnyLogs,
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
  return useMemo(() => {
    const perDay = snapshot.split('\u0000');
    return Object.fromEntries(
      days.map((day, i) => [
        day,
        totalsForLogs(perDay[i] ? (JSON.parse(perDay[i]) as MealLog[]) : []),
      ]),
    );
  }, [days, snapshot]);
}

// Flips to true when the first meal is saved, wherever it's saved from.
export const useHasAnyLogs = () =>
  useSyncExternalStore(subscribeToMeals, hasAnyLogs);
