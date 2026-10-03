export type Goal = 'lose' | 'maintain' | 'gain';
export type Sex = 'male' | 'female' | 'unspecified';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'very';
export type Diet = 'veg' | 'egg' | 'nonveg' | 'vegan';

// Everything the user tells Kimbo during onboarding. Body measurements are always
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
  mediaAccess?: { camera: boolean; microphone: boolean };
  heightUnit: 'cm' | 'ftin';
  weightUnit: 'kg' | 'lb';
};

export type Answers = Partial<Profile>;
