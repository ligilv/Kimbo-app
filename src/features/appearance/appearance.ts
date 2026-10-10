import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/storage';
import { getScheme, type Scheme } from '@/theme';

export type Appearance = 'light' | 'dark';

const KEY = 'appearance';

// Dark unless the user picks Light. (An old saved 'system' also reads as dark.)
export function useAppearance(): Appearance {
  const [value] = useMMKVString(KEY, storage);
  return value === 'light' ? 'light' : 'dark';
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
