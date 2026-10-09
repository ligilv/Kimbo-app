import { calculateTargets, type Targets } from './targets';
import type { Answers, Profile } from './types';
import { formatTime } from '@/engine/time';
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
  | { kind: 'mealTimes' }
  | { kind: 'report' }
  | { kind: 'finish' };

export type Step = {
  id: string;
  topic: string; // short name for the welcome-back screen, e.g. "Your height"

  mira: (a: Answers) => string;
  input: StepInput;
  skip?: (a: Answers) => boolean;
  isAnswered: (a: Answers) => boolean;
  // Not needed for the calorie maths; profiles from before it existed still work.
  extra?: true;
  reply?: (a: Answers) => string; // the user's bubble once answered
};

// Name as Mira says it: first letter capitalised. The stored answer stays as typed.
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
  STEPS.every(
    s => s.input.kind === 'finish' || s.extra || s.skip?.(a) || s.isAnswered(a),
  );

export const targetsFor = (p: Profile): Targets =>
  calculateTargets({
    ...p,
    targetWeightKg: needsTarget(p) ? p.targetWeightKg : undefined,
  });

// One or two plain sentences on where the number comes from (TDEE -> deficit).
export function planReason(a: Profile): string {
  const t = targetsFor(a);
  const kcal = (n: number) => n.toLocaleString('en-IN');
  const why =
    a.goal === 'maintain'
      ? `That's what your body burns on a normal day, so your weight stays steady.`
      : a.goal === 'lose'
      ? `Your body burns about ${kcal(t.tdee)} kcal a day. Eating ${kcal(t.tdee - t.calories)} less means about ${t.kgPerWeek} kg a week.`
      : `Your body burns about ${kcal(t.tdee)} kcal a day. A small ${kcal(t.calories - t.tdee)} kcal extra builds muscle without much fat.`;
  const when = t.weeksToTarget
    ? ` At that pace you'd reach ${formatWeight(a.targetWeightKg!, a.weightUnit ?? 'kg')} in about ${t.weeksToTarget} weeks.`
    : '';
  return why + when;
}

const timesReply = (a: Answers) => {
  const t = a.mealTimes;
  if (!t) return '';
  if (t.varies) return 'My times vary a lot';
  return [
    `Breakfast ${formatTime(t.breakfast)}`,
    `Lunch ${formatTime(t.lunch)}`,
    t.snacks && `Snack ${formatTime(t.snacks)}`,
    `Dinner ${formatTime(t.dinner)}`,
  ]
    .filter(Boolean)
    .join(' · ');
};

export const STEPS: Step[] = [
  {
    id: 'name',
    topic: 'Your name',
    // The welcome screen already introduced Mira, so go straight in.
    mira: () => "Let's start with an easy one. What should I call you?",
    input: { kind: 'text', field: 'name', placeholder: 'Your name' },
    isAnswered: a => !!a.name?.trim(),
    reply: a => a.name ?? '',
  },
  {
    id: 'goal',
    topic: 'Your goal',
    mira: a =>
      `Nice to meet you, ${displayName(a)}. What would you like help with?`,
    input: { kind: 'choice', field: 'goal', options: GOALS },
    isAnswered: a => a.goal !== undefined,
    reply: a => label(GOALS, a.goal),
  },
  {
    id: 'activity',
    topic: 'How active you are',
    mira: a =>
      `${a.goal ? GOAL_REACTION[a.goal] : ''} How active is a normal day for you?`,
    input: { kind: 'choice', field: 'activity', options: ACTIVITIES },
    isAnswered: a => a.activity !== undefined,
    reply: a => label(ACTIVITIES, a.activity),
  },
  {
    id: 'sex',
    topic: 'A few body basics',
    mira: () => 'For the calorie maths I need a few body basics. Are you…',
    input: { kind: 'choice', field: 'sex', options: SEXES },
    isAnswered: a => a.sex !== undefined,
    reply: a => label(SEXES, a.sex),
  },
  {
    id: 'age',
    topic: 'Your age',
    mira: () => 'How old are you?',
    input: { kind: 'age' },
    isAnswered: a => a.age !== undefined,
    reply: a => `${a.age}`,
  },
  {
    id: 'height',
    topic: 'Your height',
    mira: () => 'Thanks! How tall are you?',
    input: { kind: 'height' },
    isAnswered: a => a.heightCm !== undefined,
    reply: a => formatHeight(a.heightCm!, a.heightUnit ?? 'cm'),
  },
  {
    id: 'weight',
    topic: 'Your weight',
    mira: () => 'And your current weight?',
    input: { kind: 'weight', field: 'weightKg' },
    isAnswered: a => a.weightKg !== undefined,
    reply: a => formatWeight(a.weightKg!, a.weightUnit ?? 'kg'),
  },
  {
    id: 'target',
    topic: 'Your target weight',
    mira: a =>
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
    id: 'diet',
    topic: 'What you eat',
    mira: () => 'What do you usually eat? I use it to suggest foods that fit.',
    input: { kind: 'choice', field: 'diet', options: DIETS },
    isAnswered: a => a.diet !== undefined,
    reply: a => label(DIETS, a.diet),
  },
  {
    id: 'mealTimes',
    topic: 'Your meal times',
    mira: () =>
      "When do you usually eat? I'll check in around these times, never before.",
    input: { kind: 'mealTimes' },
    extra: true,
    isAnswered: a => a.mealTimes !== undefined,
    reply: timesReply,
  },
  {
    id: 'report',
    topic: 'A blood report (optional)',
    mira: () =>
      "Last one, and it's optional. Got a recent blood report? Send a photo or PDF and I'll tell you, in plain words, what needs attention.",
    input: { kind: 'report' },
    extra: true,
    isAnswered: a => a.reportStep !== undefined,
    reply: a => (a.reportStep === 'uploaded' ? 'Sent my report' : 'Skip for now'),
  },
  {
    id: 'plan',
    topic: 'Your plan',
    mira: a => `Here's what I'll help with, ${displayName(a)}.`,
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
