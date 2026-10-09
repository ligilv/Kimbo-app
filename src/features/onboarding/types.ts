export type Goal = 'lose' | 'maintain' | 'gain';
export type Sex = 'male' | 'female' | 'unspecified';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'very';
export type Diet = 'veg' | 'egg' | 'nonveg' | 'vegan';

// Usual meal times, local "HH:MM". Snacks only if the user eats one regularly.
export type MealTimes = {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks?: string;
  varies?: boolean; // "My times vary a lot": defaults are used, gently
};

export const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: '08:30',
  lunch: '13:30',
  dinner: '20:30',
};

// Everything the user tells Mira during onboarding. Body measurements are always
// stored metric; the unit choice only changes how they are entered and shown.
export type Profile = {
  name: string;
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number; // only for lose / gain
  activity: Activity;
  diet: Diet;
  heightUnit: 'cm' | 'ftin';
  weightUnit: 'kg' | 'lb';
  // Optional so profiles saved before these questions existed still work.
  mealTimes?: MealTimes;
  reportStep?: 'uploaded' | 'skipped'; // the optional report question
};

export type Answers = Partial<Profile>;
