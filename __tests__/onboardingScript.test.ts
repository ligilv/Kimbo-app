import {
  isComplete,
  onboardingProgress,
  STEPS,
  visibleSteps,
} from '@/features/onboarding/script';
import type { Answers } from '@/features/onboarding/types';

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
  mediaAccess: { camera: true, microphone: true },
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

test('a finished profile ends on the plan with real numbers', () => {
  expect(ids(done).at(-1)).toBe('plan');
  const plan = STEPS.find(s => s.id === 'plan')!.kimbo(done);
  expect(plan).toContain('2,210 kcal a day');
  expect(plan).toContain('about 14 weeks');
});

test('progress counts only the questions that apply', () => {
  expect(onboardingProgress({ name: 'Ligil', goal: 'lose' })).toMatchObject({
    done: 2,
    total: 10, // includes the target weight and camera/mic questions
    next: { id: 'sex' },
  });
  expect(onboardingProgress({ name: 'Ligil', goal: 'maintain' }).total).toBe(9);
  expect(onboardingProgress({ name: 'Ligil' }).total).toBe(10); // goal not picked yet
});

test('declining camera and mic is explained before the plan', () => {
  const plan = STEPS.find(s => s.id === 'plan')!;
  const none = { ...done, mediaAccess: { camera: false, microphone: false } };
  expect(plan.kimbo(none)).toMatch(/^No problem, you can always type your meals/);
  const cameraOnly = { ...done, mediaAccess: { camera: true, microphone: false } };
  expect(plan.kimbo(cameraOnly)).toMatch(/^Got it, camera is on\. You can turn on the microphone later/);
  expect(plan.kimbo(done)).toMatch(/^Here's your plan/);
});
