import { DEMO_PROFILE, loadDemoAccount } from '@/features/demo/demoAccount';
import { addDays, toLocalDateKey } from '@/features/meals/dates';
import { getLogsForDate, loggedDays } from '@/features/meals/mealStore';
import { computeStreak } from '@/features/streak/streak';
import { getWater } from '@/features/water/water';
import { storage } from '@/storage';

// Every weekday, so the streak shape holds whenever a reviewer opens it.
test.each([0, 1, 2, 3, 4, 5, 6])(
  'demo month gives a 23-day streak with a rest day (day offset %i)',
  offset => {
    storage.set('meals.2020-01-01', '[]'); // something to wipe
    const now = new Date(2026, 9, 5 + offset, 13);
    loadDemoAccount(now);
    const today = toLocalDateKey(now);

    const streak = computeStreak(new Set(loggedDays()), today);
    expect(streak.days).toBe(23);
    expect(streak.loggedToday).toBe(true);
    expect(streak.restDays).toEqual([addDays(today, -9)]);

    expect(loggedDays()).toHaveLength(26);
    expect(loggedDays()).not.toContain('2020-01-01');
    expect(getLogsForDate(today).map(l => l.slot)).toEqual([
      'breakfast',
      'lunch',
    ]);
    expect(getWater(today)).toBeGreaterThan(0);
    expect(JSON.parse(storage.getString('onboarding.answers')!)).toEqual(
      DEMO_PROFILE,
    );
    expect(storage.getBoolean('onboarding.completed')).toBe(true);
  },
);
