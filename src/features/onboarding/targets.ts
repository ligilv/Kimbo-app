import type { Activity, Goal, Profile } from './types';

const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

// Daily calorie change per goal. 500 kcal/day ≈ 0.45 kg/week of fat; a smaller
// surplus for gaining keeps it mostly muscle.
const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

// Protein per kg of body weight. Higher when losing (protects muscle) or gaining.
const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose: 1.6,
  maintain: 1.2,
  gain: 1.8,
};

const MIN_CALORIES = 1200; // never suggest a crash diet
const KCAL_PER_KG = 7700;
const FAT_SHARE = 0.25;

export type Targets = {
  bmr: number; // calories burned at complete rest
  tdee: number; // calories burned on a normal day (bmr x activity)
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  kgPerWeek: number; // 0 when maintaining
  weeksToTarget?: number;
};

type TargetInput = Pick<
  Profile,
  | 'goal'
  | 'sex'
  | 'age'
  | 'heightCm'
  | 'weightKg'
  | 'activity'
  | 'targetWeightKg'
>;

const roundTo = (value: number, step: number) =>
  Math.round(value / step) * step;

// Mifflin-St Jeor. "unspecified" uses the midpoint of the male (+5) and female (-161) constants.
export function bmr({ sex, age, heightCm, weightKg }: TargetInput): number {
  const sexConstant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
}

export function calculateTargets(input: TargetInput): Targets {
  const rest = bmr(input);
  const tdee = rest * ACTIVITY_MULTIPLIER[input.activity];
  const calories = roundTo(
    Math.max(MIN_CALORIES, tdee + GOAL_ADJUSTMENT[input.goal]),
    10,
  );

  const proteinG = roundTo(input.weightKg * PROTEIN_G_PER_KG[input.goal], 5);
  const fatG = roundTo((calories * FAT_SHARE) / 9, 5);
  const carbsG = Math.max(
    0,
    roundTo((calories - proteinG * 4 - fatG * 9) / 4, 5),
  );

  // Signed so a "lose" plan held up by the calorie floor (eating at or above tdee) has no rate.
  const change = input.goal === 'gain' ? calories - tdee : tdee - calories;
  const exactKgPerWeek = Math.max(0, (change * 7) / KCAL_PER_KG);
  const weeksToTarget =
    input.targetWeightKg !== undefined &&
    input.goal !== 'maintain' &&
    exactKgPerWeek > 0
      ? Math.ceil(
          Math.abs(input.weightKg - input.targetWeightKg) / exactKgPerWeek,
        )
      : undefined;

  return {
    bmr: Math.round(rest),
    tdee: roundTo(tdee, 10),
    calories,
    proteinG,
    carbsG,
    fatG,
    kgPerWeek:
      input.goal === 'maintain' ? 0 : Math.round(exactKgPerWeek * 10) / 10,
    weeksToTarget,
  };
}
