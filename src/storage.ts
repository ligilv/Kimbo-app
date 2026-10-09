import { createMMKV } from 'react-native-mmkv';

// One shared instance for the whole app (default id: mmkv.default).
export const storage = createMMKV();

export function readJson<T>(key: string, fallback: T): T {
  const json = storage.getString(key);
  return json ? (JSON.parse(json) as T) : fallback;
}

export const writeJson = (key: string, value: unknown) =>
  storage.set(key, JSON.stringify(value));
