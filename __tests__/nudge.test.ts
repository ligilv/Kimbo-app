import { getNudge } from '@/features/home/nudge';
import type { Targets } from '@/features/onboarding/targets';

const targets: Targets = {
  bmr: 1500,
  tdee: 2300,
  calories: 1800,
  proteinG: 100,
  carbsG: 200,
  fatG: 50,
  kgPerWeek: 0,
};
const eaten = (kcal: number, protein: number) => ({
  kcal,
  protein,
  carbs: 0,
  fat: 0,
});
const at = (hour: number) => new Date(2026, 9, 4, hour);
const today = { isToday: true, diet: 'veg' as const };
const pastDay = { isToday: false, diet: 'veg' as const };

test('nothing logged asks for the meal of the moment', () => {
  expect(getNudge(eaten(0, 0), targets, at(8), today)).toEqual({
    text: 'Start with breakfast — tap here to log it.',
    slot: 'breakfast',
  });
  expect(getNudge(eaten(0, 0), targets, at(13), today)?.slot).toBe('lunch');
});

test('protein gap in the evening suggests food that fits the diet', () => {
  expect(getNudge(eaten(1200, 65), targets, at(18), today)).toEqual({
    text: "You're 35g short on protein. Paneer or dal at dinner would close it.",
    slot: 'dinner',
  });
  const nonveg = { isToday: true, diet: 'nonveg' as const };
  expect(getNudge(eaten(1200, 65), targets, at(18), nonveg)?.text).toContain(
    'Chicken or eggs',
  );
  // Same gap in the morning is too early to nag about.
  expect(getNudge(eaten(400, 10), targets, at(9), today)?.text).toBe(
    '1,400 kcal left today. Keep going!',
  );
});

test('near target is on track, over target is gentle', () => {
  expect(getNudge(eaten(1700, 95), targets, at(20), today)?.text).toBe(
    'Nicely on track today.',
  );
  const over = getNudge(eaten(2200, 120), targets, at(21), today);
  expect(over?.text).toContain("that's okay");
  expect(over?.slot).toBeUndefined();
});

test('past days get a short recap or nothing', () => {
  expect(getNudge(eaten(0, 0), targets, at(10), pastDay)).toBeNull();
  expect(getNudge(eaten(2500, 110), targets, at(10), pastDay)?.text).toBe(
    'Protein target hit 💪',
  );
  expect(getNudge(eaten(1750, 60), targets, at(10), pastDay)?.text).toBe(
    'Right on your calorie target that day.',
  );
  expect(getNudge(eaten(900, 40), targets, at(10), pastDay)).toBeNull();
});
