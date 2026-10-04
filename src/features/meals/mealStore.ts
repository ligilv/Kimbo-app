import { storage } from '@/storage';
import { type DateKey, daysBetween } from './dates';
import type { FoodItem, MealLog, MealSlot, Nutrients } from './types';

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

// Tells the sync module which meal changed, so it can send it to the server.
// A listener instead of an import keeps the store free of network code.
type MealWrittenListener = (id: string) => void;
const writtenListeners = new Set<MealWrittenListener>();
export function onMealWritten(listener: MealWrittenListener) {
  writtenListeners.add(listener);
  return () => writtenListeners.delete(listener);
}
const notifyWritten = (id: string) => writtenListeners.forEach(listener => listener(id));

export const hasAnyLogs = () =>
  storage.getAllKeys().some(key => key.startsWith(PREFIX));

// Every day with at least one meal (empty days have no key), oldest first.
export const loggedDays = (): DateKey[] =>
  storage
    .getAllKeys()
    .filter(key => key.startsWith(PREFIX))
    .map(key => key.slice(PREFIX.length))
    .sort();

export function addLog(log: MealLog) {
  const logs = getLogsForDate(log.date);
  // Saving the same log twice (e.g. a double-tapped Save) keeps one copy.
  if (logs.some(existing => existing.id === log.id)) return;
  saveDay(log.date, [...logs, log]);
  notifyWritten(log.id);
}

// ponytail: finds a log by scanning day keys (one per day with meals). Fine for
// years of use; keep an id -> date index if it ever shows up in profiling.
export function findLog(id: string): MealLog | undefined {
  const date = findDate(id);
  return date ? getLogsForDate(date).find(log => log.id === id) : undefined;
}

// Every saved meal's id, oldest day first.
export const allLogIds = () =>
  storage
    .getAllKeys()
    .filter(key => key.startsWith(PREFIX))
    .sort()
    .flatMap(key => getLogsForDate(key.slice(PREFIX.length)).map(log => log.id));

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
  notifyWritten(id);
}

export function deleteLog(id: string) {
  const date = findDate(id);
  if (!date) return;
  saveDay(
    date,
    getLogsForDate(date).filter(log => log.id !== id),
  );
  notifyWritten(id);
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

// Same food, new amount: nutrients scale in proportion (2 chapatis -> 3 is x1.5).
export function scaleItem(item: FoodItem, quantity: number): FoodItem {
  const factor = item.quantity > 0 ? quantity / item.quantity : 1;
  const oneDecimal = (n: number) => Math.round(n * 10) / 10;
  return {
    ...item,
    quantity,
    kcal: Math.round(item.kcal * factor),
    protein: oneDecimal(item.protein * factor),
    carbs: oneDecimal(item.carbs * factor),
    fat: oneDecimal(item.fat * factor),
  };
}

export function updateItem(logId: string, item: FoodItem) {
  const date = findDate(logId);
  if (!date) return;
  const log = getLogsForDate(date).find(l => l.id === logId)!;
  updateLog(logId, {
    items: log.items.map(i => (i.id === item.id ? item : i)),
  });
}

// Meals are saved as a group, so moving one item out of a bigger meal splits it
// into its own meal in the new slot. A single-item meal just changes slot.
export function moveItem(logId: string, itemId: string, slot: MealSlot) {
  const date = findDate(logId);
  if (!date) return;
  const log = getLogsForDate(date).find(l => l.id === logId)!;
  if (log.slot === slot) return;
  if (log.items.length === 1) {
    updateLog(logId, { slot });
    return;
  }
  const item = log.items.find(i => i.id === itemId);
  if (!item) return;
  const now = new Date().toISOString();
  updateLog(logId, { items: log.items.filter(i => i.id !== itemId) });
  addLog({
    id: newId(),
    date,
    slot,
    items: [item],
    rawText: item.name,
    createdAt: now,
    updatedAt: now,
  });
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
