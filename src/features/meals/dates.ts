import type { MealSlot } from './types';

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

export function getWeekDays(anchor: DateKey): DateKey[] {
  const mondayOffset = (fromDateKey(anchor).getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  const monday = addDays(anchor, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function daysBetween(start: DateKey, end: DateKey): DateKey[] {
  const days: DateKey[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export const isToday = (key: DateKey, now = new Date()) =>
  key === toLocalDateKey(now);

export const isYesterday = (key: DateKey, now = new Date()) =>
  key === addDays(toLocalDateKey(now), -1);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatDayLabel(key: DateKey, now = new Date()): string {
  if (isToday(key, now)) return 'Today';
  if (isYesterday(key, now)) return 'Yesterday';
  return formatShortDate(key);
}

// Always the date, e.g. "Wed, 1 Oct".
export function formatShortDate(key: DateKey): string {
  const date = fromDateKey(key);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${
    MONTHS[date.getMonth()]
  }`;
}


const SLOT_WORDS: [RegExp, MealSlot][] = [
  [/\bbreakfast\b/i, 'breakfast'],
  [/\blunch\b/i, 'lunch'],
  [/\bsnacks?\b/i, 'snacks'],
  [/\b(dinner|supper)\b/i, 'dinner'],
];
export function slotFromText(text: string): MealSlot | undefined {
  let best: { at: number; slot: MealSlot } | undefined;
  for (const [pattern, slot] of SLOT_WORDS) {
    const at = text.search(pattern);
    if (at >= 0 && (!best || at < best.at)) best = { at, slot };
  }
  return best?.slot;
}

export function defaultSlotFor(now = new Date()): MealSlot {
  const hour = now.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 19) return 'snacks';
  return 'dinner';
}
