import { useMMKVNumber, useMMKVString } from 'react-native-mmkv';
import type { DateKey } from '@/features/meals/dates';
import { storage } from '@/storage';

// Stored in ml, one key per day ("water.2026-10-04"). Phone only for now.
// ponytail: not synced to the server; add a table and PUT /water/:date if needed.
export const GLASS_ML = 250;
const keyFor = (date: DateKey) => `water.${date}`;

// About 35 ml per kg of body weight, in whole glasses, kept between 6 and 16.
export const waterTargetMl = (weightKg: number) =>
  Math.min(16, Math.max(6, Math.round((weightKg * 35) / GLASS_ML))) * GLASS_ML;

export const getWater = (date: DateKey) => storage.getNumber(keyFor(date)) ?? 0;

export function addWater(date: DateKey, ml: number) {
  const next = Math.max(0, getWater(date) + ml);
  if (next === 0) storage.remove(keyFor(date));
  else storage.set(keyFor(date), next);
}

export const useWater = (date: DateKey) =>
  useMMKVNumber(keyFor(date), storage)[0] ?? 0;

export type WaterUnit = 'glass' | 'l';
export function useWaterUnit(): [WaterUnit, (unit: WaterUnit) => void] {
  const [unit, setUnit] = useMMKVString('water.unit', storage);
  return [unit === 'l' ? 'l' : 'glass', setUnit];
}

export const formatWater = (ml: number, unit: WaterUnit) =>
  unit === 'l'
    ? `${Math.round(ml / 100) / 10} L`
    : `${Math.round((ml / GLASS_ML) * 10) / 10} ${
        ml === GLASS_ML ? 'glass' : 'glasses'
      }`;
