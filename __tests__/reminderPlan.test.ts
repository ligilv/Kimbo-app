import type { Medicine } from '@/features/medicines/medicineStore';
import { type DayFacts, type PlanInput, planReminders } from '@/features/reminders/plan';

const now = new Date(2026, 9, 10, 9, 0); // Sat 10 Oct, 9:00
const empty: DayFacts = { loggedSlots: [], handled: [], snoozedUntil: {}, doses: {} };
const vitD: Medicine = { id: 'm1', name: 'Vitamin D3', dose: '1 capsule', time: '21:00', frequency: 'daily', startDate: '2026-10-01', remind: true };

const plan = (o: Partial<PlanInput> = {}) =>
  planReminders({
    now,
    mealTimes: { breakfast: '08:30', lunch: '13:30', dinner: '20:30' },
    medicines: [],
    isDueOn: () => true,
    dayFacts: () => empty,
    followups: [],
    ...o,
  }).map(r => r.id);

test('meals from now on, today and tomorrow; past ones dropped', () => {
  expect(plan()).toEqual([
    'meal:2026-10-10:lunch',
    'meal:2026-10-10:dinner',
    'meal:2026-10-11:breakfast',
    'meal:2026-10-11:lunch',
    'meal:2026-10-11:dinner',
  ]);
});

test('logged or skipped meals get no reminder; "times vary" gets none at all', () => {
  const today = (d: string): DayFacts => (d === '2026-10-10' ? { ...empty, loggedSlots: ['lunch'], handled: ['meal:dinner'] } : empty);
  expect(plan({ dayFacts: today }).filter(id => id.includes('10-10'))).toEqual([]);
  expect(plan({ mealTimes: { breakfast: '08:30', lunch: '13:30', dinner: '20:30', varies: true } })).toEqual([]);
});

test('medicine: only when Remind me is on and the dose is not taken yet', () => {
  const mealsOff = { mealTimes: { breakfast: '08:30', lunch: '13:30', dinner: '20:30', varies: true } };
  expect(plan({ ...mealsOff, medicines: [vitD] })).toEqual(['med:2026-10-10:m1', 'med:2026-10-11:m1']);
  expect(plan({ ...mealsOff, medicines: [{ ...vitD, remind: false }] })).toEqual([]);
  const taken = (d: string): DayFacts => (d === '2026-10-10' ? { ...empty, doses: { m1: { status: 'taken', at: '' } } } : empty);
  expect(plan({ ...mealsOff, medicines: [vitD], dayFacts: taken })).toEqual(['med:2026-10-11:m1']);
});

test('a snooze moves the reminder to when the snooze ends', () => {
  const until = new Date(2026, 9, 10, 21, 30).toISOString();
  const snoozed = (d: string): DayFacts => (d === '2026-10-10' ? { ...empty, snoozedUntil: { 'med:m1': until } } : empty);
  const [first] = planReminders({
    now, mealTimes: { breakfast: '08:30', lunch: '13:30', dinner: '20:30', varies: true },
    medicines: [vitD], isDueOn: () => true, dayFacts: snoozed, followups: [],
  });
  expect(first.at).toBe(new Date(until).getTime());
});

test('report follow-up: only open ones still waiting, not before 10 am', () => {
  const remindAt = new Date(2026, 9, 12, 7, 0).toISOString();
  const f = { id: 'f1', reportId: 'r', key: 'ldl', label: 'LDL', status: 'high' as const, state: 'open' as const, remindAt };
  const r = planReminders({
    now, mealTimes: { breakfast: '08:30', lunch: '13:30', dinner: '20:30', varies: true },
    medicines: [], isDueOn: () => true, dayFacts: () => empty, followups: [f, { ...f, id: 'f2', state: 'treating' }],
  });
  expect(r.map(x => x.id)).toEqual(['followup:f1']);
  expect(new Date(r[0].at).getHours()).toBe(10);
});
