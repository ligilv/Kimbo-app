import { bmr, calculateTargets } from '@/features/onboarding/targets';

const base = {
  sex: 'male' as const,
  age: 30,
  heightCm: 175,
  weightKg: 80,
  activity: 'moderate' as const,
};

test('bmr follows Mifflin-St Jeor', () => {
  // 10*80 + 6.25*175 - 5*30 + 5 = 1748.75
  expect(bmr({ ...base, goal: 'maintain' })).toBeCloseTo(1748.75);
  expect(bmr({ ...base, sex: 'female', goal: 'maintain' })).toBeCloseTo(1582.75);
  expect(bmr({ ...base, sex: 'unspecified', goal: 'maintain' })).toBeCloseTo(1665.75);
});

test('maintain eats at tdee with macros that add up', () => {
  const t = calculateTargets({ ...base, goal: 'maintain' });
  expect(t.tdee).toBe(2710); // 1748.75 * 1.55
  expect(t.calories).toBe(2710);
  expect(t.kgPerWeek).toBe(0);
  expect(t.weeksToTarget).toBeUndefined();
  const macroKcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
  expect(Math.abs(macroKcal - t.calories)).toBeLessThan(30);
});

test('lose is a 500 kcal deficit with a weeks estimate', () => {
  const t = calculateTargets({ ...base, goal: 'lose', targetWeightKg: 74 });
  expect(t.calories).toBe(2210);
  expect(t.proteinG).toBe(130); // 1.6 g/kg
  expect(t.kgPerWeek).toBe(0.5);
  expect(t.weeksToTarget).toBe(14); // 6 kg / 0.45 kg a week, rounded up
});

test('never goes below the 1200 kcal floor', () => {
  const t = calculateTargets({
    sex: 'female',
    age: 60,
    heightCm: 150,
    weightKg: 45,
    activity: 'sedentary',
    goal: 'lose',
    targetWeightKg: 42,
  });
  expect(t.calories).toBe(1200);
});
