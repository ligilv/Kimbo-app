import { addDays, type DateKey } from '@/features/meals/dates';
import { SLOT_LABEL } from '@/features/meals/format';
import { totalsForLogs } from '@/features/meals/mealStore';
import {
  MEAL_SLOTS,
  type MealLog,
  type MealSlot,
} from '@/features/meals/types';
import type { Targets } from '@/features/onboarding/targets';

export type Range = 7 | 30;
export type DayTotal = {
  date: DateKey;
  kcal: number;
  protein: number;
  logged: boolean;
};
export type Summary = {
  range: Range;
  days: DayTotal[]; // oldest first, ending today
  daysLogged: number;
  avgKcal: number; // averages skip days with nothing logged
  avgProtein: number;
  onTargetDays: number; // within 10% of the calorie target
  proteinHitDays: number;
  slotKcal: Record<MealSlot, number>;
  topFoods: { name: string; count: number }[];
};

const ON_TARGET = 0.1;

export function summarize(
  logsFor: (date: DateKey) => MealLog[],
  targets: Targets,
  today: DateKey,
  range: Range,
): Summary {
  const slotKcal = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
  const foods = new Map<string, { name: string; count: number }>();

  const days = Array.from({ length: range }, (_, i) => {
    const date = addDays(today, i - range + 1);
    const logs = logsFor(date);
    for (const log of logs) {
      for (const item of log.items) {
        slotKcal[log.slot] += item.kcal;
        const key = item.name.trim().toLowerCase();
        const food = foods.get(key) ?? {
          name: key.charAt(0).toUpperCase() + key.slice(1),
          count: 0,
        };
        food.count += 1;
        foods.set(key, food);
      }
    }
    const { kcal, protein } = totalsForLogs(logs);
    return { date, kcal, protein, logged: logs.length > 0 };
  });

  const logged = days.filter(d => d.logged);
  const avg = (pick: (d: DayTotal) => number) =>
    logged.length
      ? Math.round(logged.reduce((sum, d) => sum + pick(d), 0) / logged.length)
      : 0;

  return {
    range,
    days,
    daysLogged: logged.length,
    avgKcal: avg(d => d.kcal),
    avgProtein: avg(d => d.protein),
    onTargetDays: logged.filter(
      d => Math.abs(d.kcal - targets.calories) <= targets.calories * ON_TARGET,
    ).length,
    proteinHitDays: logged.filter(d => d.protein >= targets.proteinG).length,
    slotKcal: Object.fromEntries(
      MEAL_SLOTS.map(slot => [slot, Math.round(slotKcal[slot])]),
    ) as Record<MealSlot, number>,
    topFoods: [...foods.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 10),
  };
}

// Kimbo's line when the AI one isn't available (offline, server down).
export function ruleInsight(s: Summary): string {
  if (s.daysLogged === 0) {
    return `Nothing logged in the last ${s.range} days yet. Log a meal and I'll start spotting patterns.`;
  }
  const biggest = MEAL_SLOTS.reduce((a, b) =>
    s.slotKcal[b] > s.slotKcal[a] ? b : a,
  );
  return `You logged ${s.daysLogged} of ${s.range} days and hit your protein on ${s.proteinHitDays}. ${SLOT_LABEL[biggest]} is your biggest meal.`;
}
