import { DEMO_PROFILE, loadDemoAccount } from '@/features/demo/demoAccount';
import { addDays, toLocalDateKey } from '@/features/meals/dates';
import { getLogsForDate, loggedDays } from '@/features/meals/mealStore';
import { getDoses, getMedicines } from '@/features/medicines/medicineStore';
import { dueFollowups, getFollowups, getReports } from '@/features/reports/reportStore';
import { storage } from '@/storage';

test('demo month: meals so far today, a report with one open follow-up, a medicine', () => {
  storage.set('meals.2020-01-01', '[]'); // something to wipe
  const now = new Date(2026, 9, 10, 14, 0);
  loadDemoAccount(now);
  const today = toLocalDateKey(now);

  expect(loggedDays()).toHaveLength(26);
  expect(loggedDays()).not.toContain('2020-01-01');
  // 2 pm: breakfast and lunch are eaten, snack and dinner not yet.
  expect(getLogsForDate(today).map(l => l.slot)).toEqual(['breakfast', 'lunch']);

  expect(getReports()).toHaveLength(1);
  expect(dueFollowups(getFollowups(), now).map(f => f.key)).toEqual(['vitamin_b12']);
  const [med] = getMedicines();
  expect(med.name).toBe('Vitamin D3');
  expect(getDoses(addDays(today, -1))[med.id]?.status).toBe('taken');
  expect(getDoses(addDays(today, -4))[med.id]).toBeUndefined();

  expect(JSON.parse(storage.getString('onboarding.answers')!)).toEqual(DEMO_PROFILE);
  expect(storage.getBoolean('onboarding.completed')).toBe(true);
});
