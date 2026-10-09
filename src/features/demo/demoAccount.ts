import { toMinutes } from '@/engine/time';
import { addDays, type DateKey, fromDateKey, toLocalDateKey } from '@/features/meals/dates';
import { addLog, newId } from '@/features/meals/mealStore';
import { recordDose, saveMedicine } from '@/features/medicines/medicineStore';
import { DEFAULT_MEAL_TIMES, type Profile } from '@/features/onboarding/types';
import { addReport, answerFollowup, getFollowups, remindLater, updateFollowup } from '@/features/reports/reportStore';
import { type MockMeal, MOCK_MEALS } from '@/mocks/parseMealResponses';
import { SAMPLE_REPORT } from '@/mocks/sampleReport';
import { storage } from '@/storage';

// Reviewer demo (tap the version number 5 times in Health > Settings): replaces
// everything on the phone with a sample month, ending now, so every part of the
// app has something to show: meals, a report with follow-ups, a medicine.

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
  mealTimes: DEFAULT_MEAL_TIMES,
  reportStep: 'uploaded',
};

export const DEMO_DAYS = 30;
const MISSED = new Set([7, 24, 25, 26]); // a few empty days; day 7 back makes today a 7-day run
const REPORT_DAYS_AGO = 10;

const MENU: Record<MockMeal['slot'], (keyof typeof MOCK_MEALS)[]> = {
  breakfast: ['poha', 'idli', 'eggs'],
  lunch: ['dalRoti', 'rajmaChawal'],
  snacks: ['fruit', 'samosa'],
  dinner: ['paneer', 'khichdi'],
};
const SLOT_TIME = { ...DEFAULT_MEAL_TIMES, snacks: '17:00' };

// The same "random" choices every time, so the demo looks the same for everyone.
const pick = <T>(list: T[], seed: number) => list[(seed * 7 + 3) % list.length];

const at = (date: DateKey, hhmm: string) => {
  const d = fromDateKey(date);
  const minutes = toMinutes(hhmm) + 10; // logged a little after the usual time
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};

export function demoDay(daysAgo: number, now = new Date()): MockMeal[] {
  if (MISSED.has(daysAgo)) return [];
  const slots: MockMeal['slot'][] =
    daysAgo % 4 === 1 ? ['breakfast', 'lunch', 'dinner'] : ['breakfast', 'lunch', 'snacks', 'dinner'];
  const date = addDays(toLocalDateKey(now), -daysAgo);
  return slots
    .filter(slot => at(date, SLOT_TIME[slot]) <= now) // today: only meals already eaten
    .map(slot => MOCK_MEALS[pick(MENU[slot], daysAgo + slot.length)]);
}

export function loadDemoAccount(now = new Date()) {
  storage.clearAll(); // logs out whoever was here; a new device id is made on next sync
  const today: DateKey = toLocalDateKey(now);

  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const date = addDays(today, -daysAgo);
    for (const { slot, rawText, response } of demoDay(daysAgo, now)) {
      const stamp = at(date, SLOT_TIME[slot]).toISOString();
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
  }

  // A report ten days ago: Vitamin D is being treated, B12 is still open
  // (Mira asks on Today), LDL was "not yet" and comes back in two days.
  const reportDay = addDays(today, -REPORT_DAYS_AGO);
  const reportTime = at(reportDay, '19:00');
  addReport({ ...SAMPLE_REPORT, takenOn: reportDay }, reportTime);
  const byKey = (key: string) => getFollowups().find(f => f.key === key)!;
  const vitD = byKey('vitamin_d');
  answerFollowup(vitD.id, 'prescribed', reportTime);
  const medicine = saveMedicine({
    name: 'Vitamin D3',
    dose: '1 capsule',
    time: '21:00',
    frequency: 'daily',
    startDate: reportDay,
    days: 60,
    remind: true,
    forKey: 'vitamin_d',
  });
  updateFollowup(vitD.id, { medicineId: medicine.id });
  for (let daysAgo = REPORT_DAYS_AGO; daysAgo >= 1; daysAgo--) {
    if (daysAgo === 4) continue; // one missed dose
    recordDose(addDays(today, -daysAgo), medicine.id, 'taken', at(addDays(today, -daysAgo), '21:00'));
  }
  const ldl = byKey('ldl');
  answerFollowup(ldl.id, 'not_yet', reportTime);
  remindLater(ldl.id, REPORT_DAYS_AGO + 2, reportTime);

  storage.set('onboarding.answers', JSON.stringify(DEMO_PROFILE));
  storage.set('onboarding.completed', true); // last: this switches the app to Today
}
