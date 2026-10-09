import {
  isComplete,
  onboardingProgress,
  planReason,
  visibleSteps,
} from '@/features/onboarding/script';
import { type Answers, DEFAULT_MEAL_TIMES, type Profile } from '@/features/onboarding/types';

const ids = (a: Answers) => visibleSteps(a).map(s => s.id);

const done: Answers = {
  name: 'Ligil',
  goal: 'lose',
  sex: 'male',
  age: 30,
  heightCm: 175,
  heightUnit: 'cm',
  weightKg: 80,
  weightUnit: 'kg',
  targetWeightKg: 74,
  activity: 'moderate',
  diet: 'veg',
};

test('starts with the intro and stops at the first unanswered question', () => {
  expect(ids({})).toEqual(['name']);
  expect(ids({ name: 'Ligil' })).toEqual(['name', 'goal']);
});

test('maintain skips the target weight question', () => {
  const a = { ...done, goal: 'maintain' as const, targetWeightKg: undefined };
  expect(ids(a)).not.toContain('target');
  expect(isComplete(a)).toBe(true);
});

test('switching goal to gain re-asks a target that now points the wrong way', () => {
  const a = { ...done, goal: 'gain' as const }; // 74 kg target is below 80 kg
  expect(ids(a).at(-1)).toBe('target');
  expect(isComplete(a)).toBe(false);
});

test('a finished profile asks meal times and the optional report, then the plan', () => {
  expect(ids(done).at(-1)).toBe('mealTimes');
  expect(isComplete(done)).toBe(true); // meal times and report aren't needed for the maths
  const answered = { ...done, mealTimes: DEFAULT_MEAL_TIMES, reportStep: 'skipped' as const };
  expect(ids(answered).at(-1)).toBe('plan');
  expect(planReason(done as Profile)).toContain('about 14 weeks');
});

test('progress counts only the questions that apply', () => {
  expect(onboardingProgress({ name: 'Ligil', goal: 'lose' })).toMatchObject({
    done: 2,
    total: 11, // includes the target weight question
    next: { id: 'activity' },
  });
  expect(onboardingProgress({ name: 'Ligil', goal: 'maintain' }).total).toBe(10);
  expect(onboardingProgress({ name: 'Ligil' }).total).toBe(11); // goal not picked yet
});

