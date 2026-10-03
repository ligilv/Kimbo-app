import { addDays, type DateKey, toLocalDateKey } from '@/features/meals/dates';
import { addLog, hasAnyLogs, newId } from '@/features/meals/mealStore';
import { storage } from '@/storage';
import { type MockMeal, MOCK_MEALS } from './parseMealResponses';

const SEEDED_KEY = 'dev.mockMealsSeeded';

// Days back from today -> meals. Today is half-logged so Home shows a day in progress.
const PLAN: Record<number, (keyof typeof MOCK_MEALS)[]> = {
  6: ['eggs', 'rajmaChawal', 'khichdi'],
  5: ['poha', 'dalRoti', 'samosa', 'paneer'],
  4: ['idli', 'dalRoti', 'fruit', 'khichdi'],
  2: ['eggs', 'rajmaChawal', 'samosa', 'paneer'],
  1: ['poha', 'dalRoti', 'fruit', 'khichdi'],
  0: ['idli', 'dalRoti'],
};

function toLog(date: DateKey, { slot, rawText, response }: MockMeal) {
  const now = new Date().toISOString();
  addLog({
    id: newId(),
    date,
    slot,
    rawText,
    items: response.items.map(item => ({ ...item, id: newId() })),
    createdAt: now,
    updatedAt: now,
  });
}

// ponytail: dev-only stand-in for the backend. Fills the last week once, on a
// fresh install with no meals. Delete this file and its call in App.tsx when
// Log Meal talks to the real server.
export function seedMockMeals() {
  if (!__DEV__ || storage.getBoolean(SEEDED_KEY) || hasAnyLogs()) return;
  const today = toLocalDateKey(new Date());
  for (const [daysAgo, meals] of Object.entries(PLAN)) {
    const date = addDays(today, -Number(daysAgo));
    meals.forEach(name => toLog(date, MOCK_MEALS[name]));
  }
  storage.set(SEEDED_KEY, true);
}
