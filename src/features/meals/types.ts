export type MealSlot = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export const MEAL_SLOTS: MealSlot[] = [
  'breakfast',
  'lunch',
  'snacks',
  'dinner',
];

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem extends Nutrients {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  guessed?: boolean; // the amount was assumed, not stated
}

export interface MealLog {
  id: string;
  date: string; // local calendar date 'YYYY-MM-DD', not an ISO timestamp
  slot: MealSlot;
  items: FoodItem[];
  rawText: string;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

export interface DailyTargets extends Nutrients {}
