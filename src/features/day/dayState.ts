import { useMMKVObject } from 'react-native-mmkv';
import type { DateKey } from '@/features/meals/dates';
import { readJson, storage, writeJson } from '@/storage';

// What the user did with Mira's prompts on one day: skipped ("meal:breakfast",
// "nudge:protein") and snoozed items. A skip counts as handled for the day.
export type DayState = {
  handled: Record<string, string>; // key -> ISO time it was skipped/dismissed
  snoozedUntil: Record<string, string>;
};

const EMPTY: DayState = { handled: {}, snoozedUntil: {} };
const keyFor = (date: DateKey) => `day.${date}`;

export const getDayState = (date: DateKey) => readJson(keyFor(date), EMPTY);

export function markHandled(date: DateKey, key: string, now = new Date()) {
  const day = getDayState(date);
  writeJson(keyFor(date), { ...day, handled: { ...day.handled, [key]: now.toISOString() } });
}

export function snooze(date: DateKey, key: string, minutes: number, now = new Date()) {
  const day = getDayState(date);
  const until = new Date(now.getTime() + minutes * 60_000).toISOString();
  writeJson(keyFor(date), { ...day, snoozedUntil: { ...day.snoozedUntil, [key]: until } });
}

export function useDayState(date: DateKey): DayState {
  const [day] = useMMKVObject<DayState>(keyFor(date), storage);
  return day ?? EMPTY;
}
