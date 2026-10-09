import { Appearance as RNAppearance, useColorScheme } from 'react-native';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/storage';
import { getScheme, type Scheme } from '@/theme';

export type Appearance = 'light' | 'dark' | 'system';

const KEY = 'appearance';

// Light unless the user picks otherwise: a health app shouldn't open dark.
export function useAppearance(): Appearance {
  const [value] = useMMKVString(KEY, storage);
  return (value as Appearance | undefined) ?? 'light';
}

export function useScheme(): Scheme {
  const appearance = useAppearance();
  const phone = useColorScheme();
  if (appearance === 'system') return phone === 'dark' ? 'dark' : 'light';
  return appearance;
}

const resolve = (a: Appearance): Scheme =>
  a === 'system' ? (RNAppearance.getColorScheme() === 'dark' ? 'dark' : 'light') : a;

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
  const to = resolve(next);
  if (from === to) return commit(); // e.g. Light -> Match phone on a light phone
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
