import { useMemo, useSyncExternalStore } from 'react';
import { useMMKVObject } from 'react-native-mmkv';
import { addDays, type DateKey, fromDateKey } from '@/features/meals/dates';
import { newId } from '@/features/meals/mealStore';
import { readJson, storage, writeJson } from '@/storage';

export type Medicine = {
  id: string;
  name: string; // "Vitamin D3"
  dose: string; // "1 capsule"
  time: string; // "21:00", local
  frequency: 'daily' | 'weekly'; // weekly = same weekday as the start
  startDate: DateKey;
  days?: number; // how long to take it; undefined = ongoing
  remind: boolean;
  forKey?: string; // the report value it treats, e.g. "vitamin_d"
};

export type DoseStatus = 'taken' | 'skipped';
export type Dose = { status: DoseStatus; at: string };

const MEDICINES = 'medicines';
const dosesKey = (date: DateKey) => `doses.${date}`;

export const getMedicines = () => readJson<Medicine[]>(MEDICINES, []);

export function saveMedicine(input: Omit<Medicine, 'id'> & { id?: string }): Medicine {
  const medicine = { ...input, id: input.id ?? newId() };
  const others = getMedicines().filter(m => m.id !== medicine.id);
  writeJson(MEDICINES, [...others, medicine]);
  return medicine;
}

export const removeMedicine = (id: string) =>
  writeJson(MEDICINES, getMedicines().filter(m => m.id !== id));

export function isDueOn(medicine: Medicine, date: DateKey): boolean {
  if (date < medicine.startDate) return false;
  if (medicine.days !== undefined && date >= addDays(medicine.startDate, medicine.days))
    return false;
  return (
    medicine.frequency === 'daily' ||
    fromDateKey(date).getDay() === fromDateKey(medicine.startDate).getDay()
  );
}

export const getDoses = (date: DateKey) =>
  readJson<Record<string, Dose>>(dosesKey(date), {});

export function recordDose(date: DateKey, id: string, status: DoseStatus, now = new Date()) {
  writeJson(dosesKey(date), { ...getDoses(date), [id]: { status, at: now.toISOString() } });
}

// One dot per day for the last week: taken, skipped, missed, or not due.
export type DayMark = DoseStatus | 'missed' | 'none';
export function adherence(medicine: Medicine, days: DateKey[], today: DateKey): DayMark[] {
  return days.map(day => {
    if (!isDueOn(medicine, day)) return 'none';
    const dose = getDoses(day)[medicine.id];
    if (dose) return dose.status;
    return day < today ? 'missed' : 'none';
  });
}

export function useMedicines(): Medicine[] {
  const [list] = useMMKVObject<Medicine[]>(MEDICINES, storage);
  return list ?? [];
}

// The week's dots, kept live: a dose taken from Today or from a notification
// shows here straight away.
const subscribeToDoses = (onChange: () => void) => {
  const listener = storage.addOnValueChangedListener(key => {
    if (key.startsWith('doses.')) onChange();
  });
  return () => listener.remove();
};

export function useAdherence(medicine: Medicine, days: DateKey[], today: DateKey): DayMark[] {
  const snapshot = useSyncExternalStore(subscribeToDoses, () =>
    days.map(day => storage.getString(dosesKey(day)) ?? '').join('|'),
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed when the doses snapshot changes
  return useMemo(() => adherence(medicine, days, today), [medicine, snapshot, today]);
}

export function useDoses(date: DateKey): Record<string, Dose> {
  const [doses] = useMMKVObject<Record<string, Dose>>(dosesKey(date), storage);
  return doses ?? {};
}
