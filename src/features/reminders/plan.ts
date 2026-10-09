import { formatTime, toMinutes } from '@/engine/time';
import { addDays, type DateKey, fromDateKey, toLocalDateKey } from '@/features/meals/dates';
import type { MealSlot } from '@/features/meals/types';
import type { Dose, Medicine } from '@/features/medicines/medicineStore';
import type { MealTimes } from '@/features/onboarding/types';
import type { Followup } from '@/features/reports/reportStore';

// Which phone notifications should exist right now. Pure, so it's tested like
// the engine; reminders.ts hands the result to the phone. Planned two days
// ahead, so they keep coming even if the app isn't opened for a day.

export type Reminder = {
  id: string; // stable: re-planning replaces it instead of adding a second one
  at: number; // ms since epoch
  title: string;
  body: string;
  kind: 'meal' | 'medicine' | 'followup';
  medicineId?: string; // for the Taken / Snooze buttons
};

export type DayFacts = {
  loggedSlots: MealSlot[];
  handled: string[]; // skipped today, e.g. "meal:breakfast"
  snoozedUntil: Record<string, string>;
  doses: Record<string, Dose>;
};

export type PlanInput = {
  now: Date;
  mealTimes: MealTimes;
  medicines: Medicine[];
  isDueOn: (medicine: Medicine, date: DateKey) => boolean;
  dayFacts: (date: DateKey) => DayFacts;
  followups: Followup[];
};

const DAYS_AHEAD = 2; // today and tomorrow
const MEALS: { slot: 'breakfast' | 'lunch' | 'dinner'; title: string }[] = [
  { slot: 'breakfast', title: 'Breakfast?' },
  { slot: 'lunch', title: 'Lunch?' },
  { slot: 'dinner', title: 'Dinner?' },
];

const at = (date: DateKey, hhmm: string) => {
  const d = fromDateKey(date);
  const m = toMinutes(hhmm);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d.getTime();
};

export function planReminders(input: PlanInput): Reminder[] {
  const now = input.now.getTime();
  const today = toLocalDateKey(input.now);
  const plan: Reminder[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    const facts = input.dayFacts(date);

    // Meals at the usual time, unless already logged or skipped. None when
    // times "vary a lot": a reminder at the wrong time is just noise.
    if (!input.mealTimes.varies) {
      for (const { slot, title } of MEALS) {
        if (facts.loggedSlots.includes(slot) || facts.handled.includes(`meal:${slot}`)) continue;
        const snoozed = facts.snoozedUntil[`meal:${slot}`];
        plan.push({
          id: `meal:${date}:${slot}`,
          at: snoozed ? new Date(snoozed).getTime() : at(date, input.mealTimes[slot]),
          title,
          body: "Snap your plate or just tell me what you're having.",
          kind: 'meal',
        });
      }
    }

    for (const med of input.medicines) {
      if (!med.remind || !input.isDueOn(med, date) || facts.doses[med.id]) continue;
      const snoozed = facts.snoozedUntil[`med:${med.id}`];
      plan.push({
        id: `med:${date}:${med.id}`,
        at: snoozed ? new Date(snoozed).getTime() : at(date, med.time),
        title: `${med.name}, ${med.dose}`,
        body: `Due at ${formatTime(med.time)}. Tap Taken once you've had it.`,
        kind: 'medicine',
        medicineId: med.id,
      });
    }
  }

  // "Remind me in 2 days" on a report value: not before 10 am that day.
  for (const f of input.followups) {
    if (f.state !== 'open' || !f.remindAt) continue;
    plan.push({
      id: `followup:${f.id}`,
      at: Math.max(new Date(f.remindAt).getTime(), at(toLocalDateKey(new Date(f.remindAt)), '10:00')),
      title: `Your ${f.label} is ${f.status}`,
      body: 'Seen a doctor about it yet? Tap to answer.',
      kind: 'followup',
    });
  }

  return plan.filter(r => r.at > now).sort((a, b) => a.at - b.at);
}

