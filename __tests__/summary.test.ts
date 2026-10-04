import type { MealLog, MealSlot } from '@/features/meals/types';
import type { Targets } from '@/features/onboarding/targets';
import { ruleInsight, summarize } from '@/features/progress/summary';

const targets = { calories: 2000, proteinG: 100 } as Targets;
const TODAY = '2026-10-07';

const meal = (
  slot: MealSlot,
  name: string,
  kcal: number,
  protein: number,
): MealLog => ({
  id: `${slot}-${name}`,
  date: TODAY,
  slot,
  rawText: name,
  createdAt: '',
  updatedAt: '',
  items: [
    {
      id: name,
      name,
      quantity: 1,
      unit: 'piece',
      kcal,
      protein,
      carbs: 0,
      fat: 0,
    },
  ],
});

const byDay: Record<string, MealLog[]> = {
  '2026-10-07': [meal('lunch', 'Chapati', 1900, 110)], // on target, protein hit
  '2026-10-06': [meal('dinner', 'chapati ', 2500, 60)], // over, short on protein
  '2026-10-04': [meal('breakfast', 'Idli', 1000, 40)], // under
};
const logsFor = (date: string) => byDay[date] ?? [];

test('averages only the days that have meals', () => {
  const s = summarize(logsFor, targets, TODAY, 7);
  expect(s.days).toHaveLength(7);
  expect(s.days[0].date).toBe('2026-10-01');
  expect(s.days[6]).toEqual({
    date: TODAY,
    kcal: 1900,
    protein: 110,
    logged: true,
  });
  expect(s.daysLogged).toBe(3);
  expect(s.avgKcal).toBe(1800); // (1900 + 2500 + 1000) / 3
  expect(s.avgProtein).toBe(70);
  expect(s.onTargetDays).toBe(1);
  expect(s.proteinHitDays).toBe(1);
});

test('counts foods case-insensitively and adds up each slot', () => {
  const s = summarize(logsFor, targets, TODAY, 7);
  expect(s.topFoods[0]).toEqual({ name: 'Chapati', count: 2 });
  expect(s.slotKcal).toEqual({
    breakfast: 1000,
    lunch: 1900,
    snacks: 0,
    dinner: 2500,
  });
});

test('30 days reaches back further', () => {
  const s = summarize(logsFor, targets, TODAY, 30);
  expect(s.days[0].date).toBe('2026-09-08');
  expect(s.daysLogged).toBe(3);
});

test('the fallback line names the biggest meal, or asks for a first log', () => {
  expect(ruleInsight(summarize(logsFor, targets, TODAY, 7))).toBe(
    'You logged 3 of 7 days and hit your protein on 1. Dinner is your biggest meal.',
  );
  expect(ruleInsight(summarize(() => [], targets, TODAY, 7))).toMatch(
    /^Nothing logged in the last 7 days/,
  );
});
