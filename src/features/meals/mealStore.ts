import { storage } from '@/storage';
import { type DateKey, daysBetween } from './dates';
import type { FoodItem, MealLog, Nutrients } from './types';

// One MMKV key per day ("meals.2026-10-03") holding that day's logs. Reading a
// day or a week is then a handful of direct lookups, with no scanning.
const PREFIX = 'meals.';
const keyFor = (date: DateKey) => `${PREFIX}${date}`;

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function getLogsForDate(date: DateKey): MealLog[] {
  const json = storage.getString(keyFor(date));
  return json ? (JSON.parse(json) as MealLog[]) : [];
}

function saveDay(date: DateKey, logs: MealLog[]) {
  if (logs.length === 0) storage.remove(keyFor(date));
  else storage.set(keyFor(date), JSON.stringify(logs));
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(
    (total, n) => ({
      kcal: total.kcal + n.kcal,
      protein: total.protein + n.protein,
      carbs: total.carbs + n.carbs,
      fat: total.fat + n.fat,
    }),
    ZERO,
  );
}

export const totalsForLogs = (logs: MealLog[]) =>
  sumNutrients(logs.flatMap(log => log.items));

export const getTotalsForDate = (date: DateKey) =>
  totalsForLogs(getLogsForDate(date));

export function getTotalsForRange(
  start: DateKey,
  end: DateKey,
): Record<DateKey, Nutrients> {
  return Object.fromEntries(
    daysBetween(start, end).map(day => [day, getTotalsForDate(day)]),
  );
}

export const hasAnyLogs = () =>
  storage.getAllKeys().some(key => key.startsWith(PREFIX));

export function addLog(log: MealLog) {
  const logs = getLogsForDate(log.date);
  // Saving the same log twice (e.g. a double-tapped Save) keeps one copy.
  if (logs.some(existing => existing.id === log.id)) return;
  saveDay(log.date, [...logs, log]);
}

// ponytail: finds a log by scanning day keys (one per day with meals). Fine for
// years of use; keep an id -> date index if it ever shows up in profiling.
function findDate(id: string): DateKey | undefined {
  for (const key of storage.getAllKeys()) {
    if (!key.startsWith(PREFIX)) continue;
    const date = key.slice(PREFIX.length);
    if (getLogsForDate(date).some(log => log.id === id)) return date;
  }
  return undefined;
}

export function updateLog(
  id: string,
  patch: Partial<Omit<MealLog, 'id' | 'createdAt'>>,
) {
  const date = findDate(id);
  if (!date) return;
  const logs = getLogsForDate(date);
  const current = logs.find(log => log.id === id)!;
  const updated: MealLog = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (updated.date === date) {
    saveDay(
      date,
      logs.map(log => (log.id === id ? updated : log)),
    );
  } else {
    // Moved to another day.
    saveDay(
      date,
      logs.filter(log => log.id !== id),
    );
    saveDay(updated.date, [...getLogsForDate(updated.date), updated]);
  }
}

export function deleteLog(id: string) {
  const date = findDate(id);
  if (date)
    saveDay(
      date,
      getLogsForDate(date).filter(log => log.id !== id),
    );
}

// Removing the last item of a meal removes the meal too.
export function deleteItem(logId: string, itemId: string) {
  const date = findDate(logId);
  if (!date) return;
  const logs = getLogsForDate(date);
  const log = logs.find(l => l.id === logId)!;
  const items: FoodItem[] = log.items.filter(item => item.id !== itemId);
  if (items.length === 0) deleteLog(logId);
  else updateLog(logId, { items });
}

// For the hooks: tells React when any day's meals change.
export function subscribeToMeals(onChange: () => void) {
  const listener = storage.addOnValueChangedListener(key => {
    if (key.startsWith(PREFIX)) onChange();
  });
  return () => listener.remove();
}

export const daySnapshot = (date: DateKey) =>
  storage.getString(keyFor(date)) ?? '';
