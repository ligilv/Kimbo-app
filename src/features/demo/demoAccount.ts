import { addDays, type DateKey, toLocalDateKey } from '@/features/meals/dates';
import { addLog, newId } from '@/features/meals/mealStore';
import type { Profile } from '@/features/onboarding/types';
import { addWater, GLASS_ML } from '@/features/water/water';
import { type MockMeal, MOCK_MEALS } from '@/mocks/parseMealResponses';
import { storage } from '@/storage';

// Reviewer demo (tap the version number 5 times on Profile): replaces everything
// on the phone with Ligil's profile and a month of meals, ending today, so the
// streak, progress and nudges have something to show whenever it's opened.
// Built on the phone rather than downloaded, so it's always "the last 30 days".

export const DEMO_PROFILE: Profile = {
  name: 'Ligil',
  goal: 'gain',
  sex: 'male',
  age: 25,
  heightCm: 168,
  weightKg: 65,
  targetWeightKg: 70,
  activity: 'very',
  diet: 'nonveg',
  heightUnit: 'ftin',
  weightUnit: 'kg',
};

export const DEMO_DAYS = 30;
// Day 9 back is a single miss (a forgiven rest day 🌙). Days 24–26 back are
// three misses in a row: any three days in a row put two in one week, so the
// streak always starts on day 23 back, whatever weekday today is.
const MISSED = new Set([9, 24, 25, 26]);

const MENU: Record<MockMeal['slot'], (keyof typeof MOCK_MEALS)[]> = {
  breakfast: ['poha', 'idli', 'eggs'],
  lunch: ['dalRoti', 'rajmaChawal'],
  snacks: ['fruit', 'samosa'],
  dinner: ['paneer', 'khichdi'],
};

// The same "random" choices every time, so the demo looks the same for everyone.
const pick = <T>(list: T[], seed: number) => list[(seed * 7 + 3) % list.length];

export function demoDay(daysAgo: number): MockMeal[] {
  if (MISSED.has(daysAgo)) return [];
  const slots: MockMeal['slot'][] =
    daysAgo === 0 // today is half-way through
      ? ['breakfast', 'lunch']
      : daysAgo % 4 === 1
      ? ['breakfast', 'lunch', 'dinner'] // some days skip the snack
      : ['breakfast', 'lunch', 'snacks', 'dinner'];
  return slots.map(slot => MOCK_MEALS[pick(MENU[slot], daysAgo + slot.length)]);
}

export function loadDemoAccount(now = new Date()) {
  storage.clearAll(); // logs out whoever was here; a new device id is made on next sync
  const today: DateKey = toLocalDateKey(now);

  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const date = addDays(today, -daysAgo);
    const stamp = new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
    for (const { slot, rawText, response } of demoDay(daysAgo)) {
      addLog({
        id: newId(),
        date,
        slot,
        rawText,
        items: response.items.map(item => ({ ...item, id: newId() })),
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
    if (!MISSED.has(daysAgo)) addWater(date, GLASS_ML * (4 + (daysAgo % 5)));
  }

  storage.set('onboarding.answers', JSON.stringify(DEMO_PROFILE));
  storage.set('onboarding.completed', true); // last: this switches the app to Home
}
