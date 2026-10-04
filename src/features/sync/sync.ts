import { AppState } from 'react-native';
import { API_URL, SYNC_ENABLED } from '@/config';
import { allLogIds, findLog, onMealWritten } from '@/features/meals/mealStore';
import { isComplete } from '@/features/onboarding/script';
import type { Answers } from '@/features/onboarding/types';
import { storage } from '@/storage';
import { getDeviceId } from './deviceId';
import { enqueue, markSent, type OutboxKey, readOutbox } from './outbox';

const ANSWERS_KEY = 'onboarding.answers'; // where onboarding saves its answers
const BOOTSTRAPPED_KEY = 'sync.bootstrapped';
const TIMEOUT_MS = 10_000;
const RETRY_MS = 30_000;

type Send = (
  path: string,
  init: { method: 'PUT' | 'DELETE'; body?: unknown },
) => Promise<Response>;

const httpSend: Send = async (path, { method, body }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-device-id': getDeviceId(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

function readProfile() {
  const json = storage.getString(ANSWERS_KEY);
  const answers = json ? (JSON.parse(json) as Answers) : {};
  if (!isComplete(answers)) return undefined;
  // mediaAccess is a phone setting, not profile data, so it isn't sent.
  const {
    name,
    goal,
    sex,
    age,
    heightCm,
    weightKg,
    targetWeightKg,
    activity,
    diet,
  } = answers;
  const { heightUnit, weightUnit } = answers;
  return {
    name,
    goal,
    sex,
    age,
    heightCm,
    weightKg,
    targetWeightKg,
    activity,
    diet,
    heightUnit,
    weightUnit,
  };
}

// What to send for an outbox entry, from the latest local copy.
function requestFor(key: OutboxKey): Parameters<Send> | undefined {
  if (key === 'profile') {
    const profile = readProfile();
    return profile ? ['/profile', { method: 'PUT', body: profile }] : undefined;
  }
  const id = key.slice('meal:'.length);
  const log = findLog(id);
  if (!log) return [`/meals/${id}`, { method: 'DELETE' }]; // deleted on the phone
  const { date, slot, rawText, createdAt, updatedAt, items } = log;
  return [
    `/meals/${id}`,
    {
      method: 'PUT',
      body: { date, slot, rawText, createdAt, updatedAt, items },
    },
  ];
}

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

// Sends pending changes in order. Stops at the first network failure and tries
// again later; a change the server rejects outright is dropped, not retried forever.
export async function flush(send: Send = httpSend): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (const entry of readOutbox()) {
      const request = requestFor(entry.key);
      if (!request) {
        markSent(entry); // e.g. profile not finished yet
        continue;
      }
      let res: Response;
      try {
        res = await send(...request);
      } catch {
        scheduleRetry(send);
        return; // offline or server down: keep everything for later
      }
      if (
        res.ok ||
        (res.status >= 400 && res.status < 500 && res.status !== 429)
      ) {
        if (!res.ok && __DEV__)
          console.warn(`sync: ${entry.key} rejected with ${res.status}`);
        markSent(entry);
      } else {
        scheduleRetry(send);
        return; // 429 or 5xx: try again later
      }
    }
  } finally {
    flushing = false;
  }
}

function scheduleRetry(send: Send) {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    flush(send);
  }, RETRY_MS);
}

const changed = (key: OutboxKey) => {
  enqueue(key);
  flush();
};

// Call once at app start.
export function startSync() {
  if (!SYNC_ENABLED) return;

  // First run with sync: queue what's already on the phone.
  if (!storage.getBoolean(BOOTSTRAPPED_KEY)) {
    enqueue('profile');
    allLogIds().forEach(id => enqueue(`meal:${id}`));
    storage.set(BOOTSTRAPPED_KEY, true);
  }

  onMealWritten(id => changed(`meal:${id}`));
  // Watches onboarding's saved answers, so onboarding itself needs no sync code.
  storage.addOnValueChangedListener(key => {
    if (key === ANSWERS_KEY) changed('profile');
  });
  AppState.addEventListener('change', state => {
    if (state === 'active') flush();
  });
  flush();
}
