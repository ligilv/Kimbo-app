import { computeStreak } from '@/features/streak/streak';

// 7 Oct 2026 is a Wednesday; that week runs Mon 5 – Sun 11.
const TODAY = '2026-10-07';
const streak = (...days: string[]) => computeStreak(new Set(days), TODAY);

test('no meals ever means no streak', () => {
  expect(streak()).toEqual({ days: 0, loggedToday: false, restDays: [] });
});

test('consecutive days count, ending today', () => {
  expect(streak('2026-10-05', '2026-10-06', '2026-10-07')).toMatchObject({
    days: 3,
    loggedToday: true,
  });
});

test("not having logged today yet doesn't break it", () => {
  expect(streak('2026-10-05', '2026-10-06')).toMatchObject({
    days: 2,
    loggedToday: false,
  });
});

test('one missed day a week is a rest day', () => {
  // Mon logged, Tue missed, Wed logged.
  expect(streak('2026-10-05', '2026-10-07')).toEqual({
    days: 2,
    loggedToday: true,
    restDays: ['2026-10-06'],
  });
});

test('a second missed day in the same week ends the run', () => {
  // Sun 4th (last week) logged, Mon and Tue missed, Wed logged.
  expect(streak('2026-10-04', '2026-10-07')).toMatchObject({
    days: 1,
    restDays: [],
  });
});

test('each week gets its own rest day', () => {
  // Missed Fri 2nd (last week) and Tue 6th (this week); everything else logged.
  const days = ['2026-09-30', '2026-10-01', '2026-10-03', '2026-10-04'];
  days.push('2026-10-05', '2026-10-07');
  expect(streak(...days)).toEqual({
    days: 6,
    loggedToday: true,
    restDays: ['2026-10-06', '2026-10-02'],
  });
});

test('a rest day before the first meal ever is not counted', () => {
  expect(streak('2026-10-07')).toEqual({
    days: 1,
    loggedToday: true,
    restDays: [],
  });
});
