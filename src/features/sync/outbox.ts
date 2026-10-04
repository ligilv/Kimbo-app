import { storage } from '@/storage';

// Changes waiting to reach the server, saved so they survive the app closing.
// One entry per thing that changed: a meal (by id) or the profile. The entry
// only says WHAT changed; the latest local copy is read when it's sent.
export type OutboxKey = `meal:${string}` | 'profile';
type Entry = { key: OutboxKey; version: number };

const OUTBOX_KEY = 'sync.outbox';

export const readOutbox = (): Entry[] => {
  const json = storage.getString(OUTBOX_KEY);
  return json ? (JSON.parse(json) as Entry[]) : [];
};

const writeOutbox = (entries: Entry[]) =>
  storage.set(OUTBOX_KEY, JSON.stringify(entries));

// A thing edited five times while offline is sent once, with its latest state.
export function enqueue(key: OutboxKey) {
  const entries = readOutbox();
  const existing = entries.find(e => e.key === key);
  if (existing) existing.version += 1;
  else entries.push({ key, version: 1 });
  writeOutbox(entries);
}

// Removes an entry after the server confirmed it, unless it changed again
// while the request was in flight (then the newer change still needs sending).
export function markSent(entry: Entry) {
  writeOutbox(
    readOutbox().filter(
      e => !(e.key === entry.key && e.version === entry.version),
    ),
  );
}
