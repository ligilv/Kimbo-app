import {
  addLog,
  deleteLog,
  onMealWritten,
  updateLog,
} from '@/features/meals/mealStore';
import type { MealLog } from '@/features/meals/types';
import { enqueue, readOutbox } from '@/features/sync/outbox';
import { flush } from '@/features/sync/sync';
import { storage } from '@/storage';

const meal = (id: string): MealLog => ({
  id,
  date: '2026-10-03',
  slot: 'lunch',
  rawText: 'dal',
  createdAt: '2026-10-03T07:00:00.000Z',
  updatedAt: '2026-10-03T07:00:00.000Z',
  items: [
    {
      id: `${id}-1`,
      name: 'Dal',
      quantity: 1,
      unit: 'katori',
      kcal: 180,
      protein: 9,
      carbs: 22,
      fat: 6,
    },
  ],
});

type SendArgs = [path: string, init: { method: string; body?: unknown }];
const ok = (..._args: SendArgs) =>
  Promise.resolve({ ok: true, status: 204 } as Response);
const status = (code: number) => () =>
  Promise.resolve({ ok: false, status: code } as Response);

beforeEach(() => {
  jest.useFakeTimers();
  storage.clearAll();
});
afterEach(() => jest.useRealTimers());

test('a meal edited several times offline is sent once, with its latest state', async () => {
  addLog(meal('a'));
  enqueue('meal:a');
  updateLog('a', { slot: 'dinner' });
  enqueue('meal:a');
  expect(readOutbox()).toHaveLength(1);

  const send = jest.fn(ok);
  await flush(send);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0]).toBe('/meals/a');
  expect(send.mock.calls[0][1]).toMatchObject({
    method: 'PUT',
    body: { slot: 'dinner', date: '2026-10-03' },
  });
  expect(readOutbox()).toEqual([]);
});

test('a meal deleted on the phone is deleted on the server', async () => {
  addLog(meal('a'));
  deleteLog('a');
  enqueue('meal:a');
  const send = jest.fn(ok);
  await flush(send);
  expect(send).toHaveBeenCalledWith('/meals/a', { method: 'DELETE' });
});

test('offline keeps everything for later, in order', async () => {
  addLog(meal('a'));
  addLog(meal('b'));
  enqueue('meal:a');
  enqueue('meal:b');
  await flush(() => Promise.reject(new TypeError('Network request failed')));
  expect(readOutbox().map(e => e.key)).toEqual(['meal:a', 'meal:b']);
});

test('server errors and rate limits are retried later; rejected data is dropped', async () => {
  addLog(meal('a'));
  enqueue('meal:a');
  await flush(status(503));
  expect(readOutbox()).toHaveLength(1);
  await flush(status(429));
  expect(readOutbox()).toHaveLength(1);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await flush(status(400));
  expect(readOutbox()).toEqual([]);
  expect(warn).toHaveBeenCalledWith('sync: meal:a rejected with 400');
  warn.mockRestore();
});

test('a change made while sending is still sent afterwards', async () => {
  addLog(meal('a'));
  enqueue('meal:a');
  await flush((...args) => {
    enqueue('meal:a'); // edited again mid-request
    return ok(...args);
  });
  expect(readOutbox()).toHaveLength(1);
});

test('the profile is skipped until onboarding is complete', async () => {
  enqueue('profile');
  const send = jest.fn(ok);
  await flush(send);
  expect(send).not.toHaveBeenCalled();
  expect(readOutbox()).toEqual([]);
});

test('the meal store announces every write', () => {
  const seen: string[] = [];
  const stop = onMealWritten(id => seen.push(id));
  addLog(meal('a'));
  updateLog('a', { slot: 'dinner' });
  deleteLog('a');
  stop();
  expect(seen).toEqual(['a', 'a', 'a']);
});
