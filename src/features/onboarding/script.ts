import { calculateTargets, type Targets } from './targets';
import type { Answers, Profile } from './types';
import { formatHeight, formatWeight } from './units';

type Option<T extends string> = { value: T; label: string; hint?: string };

export type StepInput =
  | { kind: 'text'; field: 'name'; placeholder: string }
  | {
      kind: 'choice';
      field: 'goal' | 'sex' | 'activity' | 'diet';
      options: Option<string>[];
    }
  | { kind: 'age' }
  | { kind: 'height' }
  | { kind: 'weight'; field: 'weightKg' | 'targetWeightKg' }
  | { kind: 'finish' };

export type Step = {
  id: string;
  topic: string; // short name for the welcome-back screen, e.g. "Your height"

  kimbo: (a: Answers) => string;
  input: StepInput;
  skip?: (a: Answers) => boolean;
  isAnswered: (a: Answers) => boolean;
  reply?: (a: Answers) => string; // the user's bubble once answered
};

// Name as Kimbo says it: first letter capitalised. The stored answer stays as typed.
export const displayName = (a: Answers) => {
  const name = a.name?.trim() ?? '';
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const label = (options: Option<string>[], value?: string) =>
  options.find(o => o.value === value)?.label ?? '';

const GOALS: Option<Profile['goal']>[] = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Stay where I am' },
  { value: 'gain', label: 'Build muscle' },
];
const SEXES: Option<Profile['sex']>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
];
const ACTIVITIES: Option<Profile['activity']>[] = [
  {
    value: 'sedentary',
    label: 'Mostly sitting',
    hint: 'Desk job, little walking',
  },
  {
    value: 'light',
    label: 'On my feet some',
    hint: 'Walks, chores, light workouts',
  },
  { value: 'moderate', label: 'Active', hint: 'Gym or sport 3–4 times a week' },
  {
    value: 'very',
    label: 'Very active',
    hint: 'Physical job or training most days',
  },
];
const DIETS: Option<Profile['diet']>[] = [
  { value: 'veg', label: 'Vegetarian' },
  { value: 'egg', label: 'Eggetarian' },
  { value: 'nonveg', label: 'Non-veg' },
  { value: 'vegan', label: 'Vegan' },
];

const GOAL_REACTION: Record<Profile['goal'], string> = {
  lose: "Love it. We'll do it steadily, no crash diets.",
  maintain: 'Nice, staying steady is underrated.',
  gain: "Great, we'll make sure you eat enough to build.",
};

const needsTarget = (a: Answers) => a.goal === 'lose' || a.goal === 'gain';

const targetIsValid = (a: Answers) =>
  a.targetWeightKg !== undefined &&
  a.weightKg !== undefined &&
  (a.goal === 'lose'
    ? a.targetWeightKg < a.weightKg
    : a.targetWeightKg > a.weightKg);

export const isComplete = (a: Answers): a is Profile =>
  STEPS.every(s => s.input.kind === 'finish' || s.skip?.(a) || s.isAnswered(a));

export const targetsFor = (p: Profile): Targets =>
  calculateTargets({
    ...p,
    targetWeightKg: needsTarget(p) ? p.targetWeightKg : undefined,
  });

const planMessage = (a: Answers) => {
  if (!isComplete(a)) return '';
  const t = targetsFor(a);
  const kcal = (n: number) => n.toLocaleString('en-IN');
  const why =
    a.goal === 'maintain'
      ? `That's what your body burns on a normal day (${kcal(
          t.tdee,
        )} kcal), so your weight stays steady.`
      : a.goal === 'lose'
      ? `Your body burns about ${kcal(t.tdee)} kcal a day. Eating ${kcal(
          t.tdee - t.calories,
        )} less means about ${t.kgPerWeek} kg a week.`
      : `Your body burns about ${kcal(t.tdee)} kcal a day. A small ${kcal(
          t.calories - t.tdee,
        )} kcal extra builds muscle without much fat.`;
  const when = t.weeksToTarget
    ? ` At that pace you'd reach ${formatWeight(
        a.targetWeightKg!,
        a.weightUnit ?? 'kg',
      )} in about ${t.weeksToTarget} weeks.`
    : '';
  return `Here's your plan, ${displayName(a)} 🎯\n\n${kcal(
    t.calories,
  )} kcal a day\nProtein ${t.proteinG} g · Carbs ${t.carbsG} g · Fat ${
    t.fatG
  } g\n\n${why}${when}`;
};

export const STEPS: Step[] = [
  {
    id: 'name',
    topic: 'Your name',
    // The welcome screen already introduced Kimbo, so go straight in.
    kimbo: () => "Let's start with an easy one 👋 What should I call you?",
    input: { kind: 'text', field: 'name', placeholder: 'Your name' },
    isAnswered: a => !!a.name?.trim(),
    reply: a => a.name ?? '',
  },
  {
    id: 'goal',
    topic: 'Your goal',
    kimbo: a =>
      `Nice to meet you, ${displayName(a)}! What brings you to Kimbo?`,
    input: { kind: 'choice', field: 'goal', options: GOALS },
    isAnswered: a => a.goal !== undefined,
    reply: a => label(GOALS, a.goal),
  },
  {
    id: 'sex',
    topic: 'A few body basics',
    kimbo: a =>
      `${
        a.goal ? GOAL_REACTION[a.goal] : ''
      } For the calorie maths I need a few body basics.\n\nAre you…`,
    input: { kind: 'choice', field: 'sex', options: SEXES },
    isAnswered: a => a.sex !== undefined,
    reply: a => label(SEXES, a.sex),
  },
  {
    id: 'age',
    topic: 'Your age',
    kimbo: () => 'How old are you?',
    input: { kind: 'age' },
    isAnswered: a => a.age !== undefined,
    reply: a => `${a.age}`,
  },
  {
    id: 'height',
    topic: 'Your height',
    kimbo: () => 'Thanks! How tall are you?',
    input: { kind: 'height' },
    isAnswered: a => a.heightCm !== undefined,
    reply: a => formatHeight(a.heightCm!, a.heightUnit ?? 'cm'),
  },
  {
    id: 'weight',
    topic: 'Your weight',
    kimbo: () => 'And your current weight?',
    input: { kind: 'weight', field: 'weightKg' },
    isAnswered: a => a.weightKg !== undefined,
    reply: a => formatWeight(a.weightKg!, a.weightUnit ?? 'kg'),
  },
  {
    id: 'target',
    topic: 'Your target weight',
    kimbo: a =>
      a.goal === 'lose'
        ? 'What weight would you like to get down to?'
        : 'What weight would you like to build up to?',
    input: { kind: 'weight', field: 'targetWeightKg' },
    // Counted until the goal is known, so progress doesn't jump from 8 to 9 questions.
    skip: a => a.goal === 'maintain',
    // Re-asked if the goal changes and the old target points the wrong way.
    isAnswered: targetIsValid,
    reply: a => formatWeight(a.targetWeightKg!, a.weightUnit ?? 'kg'),
  },
  {
    id: 'activity',
    topic: 'How active you are',
    kimbo: () => 'How active is a normal day for you?',
    input: { kind: 'choice', field: 'activity', options: ACTIVITIES },
    isAnswered: a => a.activity !== undefined,
    reply: a => label(ACTIVITIES, a.activity),
  },
  {
    id: 'diet',
    topic: 'What you eat',
    kimbo: () => 'Last one! What do you usually eat?',
    input: { kind: 'choice', field: 'diet', options: DIETS },
    isAnswered: a => a.diet !== undefined,
    reply: a => label(DIETS, a.diet),
  },
  {
    id: 'plan',
    topic: 'Your plan',
    kimbo: planMessage,
    input: { kind: 'finish' },
    isAnswered: () => false,
  },
];

// The steps to show, in order: every answered step plus the first unanswered one.
export function visibleSteps(a: Answers): Step[] {
  const shown: Step[] = [];
  for (const step of STEPS) {
    if (step.skip?.(a)) continue;
    shown.push(step);
    if (!step.isAnswered(a)) break;
  }
  return shown;
}

// How far along an unfinished onboarding is. The plan at the end isn't a question.
export function onboardingProgress(a: Answers) {
  const questions = STEPS.filter(
    s => s.input.kind !== 'finish' && !s.skip?.(a),
  );
  const done = questions.filter(s => s.isAnswered(a)).length;
  return { done, total: questions.length, next: visibleSteps(a).at(-1)! };
}
