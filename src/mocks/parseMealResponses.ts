import type { MealSlot } from '@/features/meals/types';

// What the backend's POST /parse-meal is expected to return (see the planning notes,
// the server parse endpoint). Used to fill the app with realistic meals until the server exists.
export type ParsedItem = {
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ParseMealResponse = {
  items: ParsedItem[];
  clarification: string | null;
};

export type MockMeal = {
  slot: MealSlot;
  rawText: string;
  response: ParseMealResponse;
};

const meal = (
  slot: MealSlot,
  rawText: string,
  items: ParsedItem[],
): MockMeal => ({
  slot,
  rawText,
  response: { items, clarification: null },
});

export const MOCK_MEALS: Record<string, MockMeal> = {
  poha: meal('breakfast', 'a plate of poha and chai', [
    {
      name: 'Poha',
      quantity: 1,
      unit: 'plate',
      kcal: 270,
      protein: 5,
      carbs: 48,
      fat: 7,
    },
    {
      name: 'Masala chai',
      quantity: 1,
      unit: 'cup',
      kcal: 90,
      protein: 3,
      carbs: 12,
      fat: 3,
    },
  ]),
  idli: meal('breakfast', '3 idlis with sambar', [
    {
      name: 'Idli',
      quantity: 3,
      unit: 'piece',
      kcal: 195,
      protein: 6,
      carbs: 42,
      fat: 1,
    },
    {
      name: 'Sambar',
      quantity: 1,
      unit: 'katori',
      kcal: 130,
      protein: 6,
      carbs: 18,
      fat: 4,
    },
  ]),
  eggs: meal('breakfast', '2 boiled eggs and toast', [
    {
      name: 'Boiled egg',
      quantity: 2,
      unit: 'piece',
      kcal: 155,
      protein: 13,
      carbs: 1,
      fat: 11,
    },
    {
      name: 'Brown bread toast',
      quantity: 2,
      unit: 'slice',
      kcal: 150,
      protein: 6,
      carbs: 26,
      fat: 2,
    },
  ]),
  dalRoti: meal('lunch', '2 chapatis, dal and a bowl of curd', [
    {
      name: 'Chapati',
      quantity: 2,
      unit: 'piece',
      kcal: 240,
      protein: 6,
      carbs: 36,
      fat: 7,
    },
    {
      name: 'Dal tadka',
      quantity: 1,
      unit: 'katori',
      kcal: 180,
      protein: 9,
      carbs: 22,
      fat: 6,
    },
    {
      name: 'Curd',
      quantity: 1,
      unit: 'katori',
      kcal: 100,
      protein: 4,
      carbs: 6,
      fat: 6,
    },
  ]),
  rajmaChawal: meal('lunch', 'rajma chawal', [
    {
      name: 'Rajma',
      quantity: 1,
      unit: 'katori',
      kcal: 210,
      protein: 11,
      carbs: 30,
      fat: 5,
    },
    {
      name: 'Steamed rice',
      quantity: 1,
      unit: 'plate',
      kcal: 260,
      protein: 5,
      carbs: 57,
      fat: 1,
    },
  ]),
  fruit: meal('snacks', 'a banana and a handful of almonds', [
    {
      name: 'Banana',
      quantity: 1,
      unit: 'piece',
      kcal: 105,
      protein: 1,
      carbs: 27,
      fat: 0,
    },
    {
      name: 'Almonds',
      quantity: 10,
      unit: 'piece',
      kcal: 70,
      protein: 3,
      carbs: 2,
      fat: 6,
    },
  ]),
  samosa: meal('snacks', 'samosa and chai', [
    {
      name: 'Samosa',
      quantity: 1,
      unit: 'piece',
      kcal: 260,
      protein: 4,
      carbs: 30,
      fat: 14,
    },
    {
      name: 'Masala chai',
      quantity: 1,
      unit: 'cup',
      kcal: 90,
      protein: 3,
      carbs: 12,
      fat: 3,
    },
  ]),
  paneer: meal('dinner', 'paneer bhurji with 2 rotis', [
    {
      name: 'Paneer bhurji',
      quantity: 1,
      unit: 'katori',
      kcal: 320,
      protein: 18,
      carbs: 8,
      fat: 24,
    },
    {
      name: 'Chapati',
      quantity: 2,
      unit: 'piece',
      kcal: 240,
      protein: 6,
      carbs: 36,
      fat: 7,
    },
  ]),
  khichdi: meal('dinner', 'a bowl of khichdi', [
    {
      name: 'Moong dal khichdi',
      quantity: 1,
      unit: 'bowl',
      kcal: 350,
      protein: 12,
      carbs: 58,
      fat: 8,
    },
  ]),
};
