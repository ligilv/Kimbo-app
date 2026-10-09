import { addDays } from '@/features/meals/dates';
import { milestonesFor, runEndingOn, streakLine } from '@/features/today/milestones';

const today = '2026-10-10';
const daysBack = (n: number) => new Set(Array.from({ length: n }, (_, i) => addDays(today, -i)));
const base = { date: today, kcalOn: () => 0, targetKcal: 2000, firstMealAt: 't1', lastMealAt: 't2', medicinesDue: 0, dosesTaken: [] };

test('counts days in a row, stopping at the first gap', () => {
  const logged = new Set([today, addDays(today, -1), addDays(today, -3)]);
  expect(runEndingOn(today, d => logged.has(d))).toBe(2);
  expect(runEndingOn(addDays(today, -2), d => logged.has(d))).toBe(0);
});

test('streak milestones at 3 and 7, not at 4', () => {
  const at = (n: number) => milestonesFor({ ...base, hasMeals: d => daysBack(n).has(d) }).map(m => m.id);
  expect(at(3)).toEqual(['streak:3']);
  expect(at(4)).toEqual([]);
  expect(at(7)).toEqual(['streak:7']);
});

test('no milestone until the day has a meal', () => {
  expect(milestonesFor({ ...base, firstMealAt: undefined, lastMealAt: undefined, hasMeals: d => daysBack(3).has(d) })).toEqual([]);
});

test('a week on target needs all 7 days within 10%', () => {
  const week = daysBack(7);
  const ids = (kcal: (d: string) => number) =>
    milestonesFor({ ...base, hasMeals: d => week.has(d), kcalOn: kcal }).map(m => m.id);
  expect(ids(() => 2100)).toEqual(['streak:7', 'target:7']);
  expect(ids(d => (d === addDays(today, -3) ? 2500 : 2000))).toEqual(['streak:7']);
});

test('all medicines taken, skips do not count', () => {
  const none = () => false;
  expect(milestonesFor({ ...base, hasMeals: none, medicinesDue: 2, dosesTaken: [{ at: 'a' }, { at: 'b' }] })[0]).toMatchObject({ id: 'meds:all', at: 'b' });
  expect(milestonesFor({ ...base, hasMeals: none, medicinesDue: 2, dosesTaken: [{ at: 'a' }] })).toEqual([]);
});

test('opening line: today counts once logged, otherwise invites continuing', () => {
  expect(streakLine(today, d => daysBack(4).has(d))).toBe('Day 4 in a row.');
  const upToYesterday = new Set([addDays(today, -1), addDays(today, -2)]);
  expect(streakLine(today, d => upToYesterday.has(d))).toBe("You've logged 2 days in a row. Today makes 3.");
  expect(streakLine(today, () => false)).toBeUndefined();
});
