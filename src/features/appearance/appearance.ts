import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/storage';
import { getScheme, type Scheme } from '@/theme';

export type Appearance = 'light' | 'dark';

const KEY = 'appearance';

// Light unless the user picks Dark. (An old saved 'system' also reads as light.)
export function useAppearance(): Appearance {
  const [value] = useMMKVString(KEY, storage);
  return value === 'dark' ? 'dark' : 'light';
}

export const useScheme = (): Scheme => useAppearance();

// A switch that changes the colours plays a short full-screen transition first
// (see AppearanceTransition); the new appearance is saved while it covers the
// screen, so the redraw underneath is never seen.
export type Switch = { from: Scheme; to: Scheme; commit: () => void };
let pending: Switch | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function changeAppearance(next: Appearance) {
  const commit = () => storage.set(KEY, next);
  const from = getScheme();
  const to = next;
  if (from === to) return commit();
  pending = { from, to, commit };
  emit();
}

export const getPendingSwitch = () => pending;
export const clearPendingSwitch = () => {
  pending = null;
  emit();
};
export const subscribeToSwitch = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
