import { addDays, type DateKey } from '@/features/meals/dates';

// Feel-good moments, worked out from what's already logged (nothing stored).
// Each one becomes a single line from Mira in that day's conversation, at the
// moment it was earned. Rare on purpose: a milestone, never a routine save.

export type Milestone = { id: string; at: string; text: string };

const LOOKBACK_DAYS = 365;
const ON_TARGET = 0.1; // within 10% of the calorie target

// Days in a row with at least one meal, ending on `date` (0 if none that day).
export function runEndingOn(date: DateKey, counts: (day: DateKey) => boolean): number {
  let n = 0;
  while (n < LOOKBACK_DAYS && counts(addDays(date, -n))) n++;
  return n;
}

const isStreakMilestone = (n: number) => n === 3 || n === 30 || n === 90 || (n > 0 && n % 7 === 0);

function streakText(n: number) {
  if (n === 3) return "3 days in a row of logging. This is how habits start.";
  if (n === 7) return 'A full week of logging, 7 days in a row. Most people stop by day 3.';
  if (n === 90) return '90 days in a row. This is just how you eat now.';
  return `${n} days in a row of logging. Keep it going.`;
}

export type MilestoneInput = {
  date: DateKey;
  hasMeals: (day: DateKey) => boolean;
  kcalOn: (day: DateKey) => number;
  targetKcal: number;
  firstMealAt?: string; // ISO time of the day's first meal
  lastMealAt?: string;
  medicinesDue: number; // due on this date
  dosesTaken: { at: string }[]; // taken (not skipped) on this date
};

export function milestonesFor(input: MilestoneInput): Milestone[] {
  const found: Milestone[] = [];

  const streak = runEndingOn(input.date, input.hasMeals);
  if (input.firstMealAt && isStreakMilestone(streak)) {
    found.push({ id: `streak:${streak}`, at: input.firstMealAt, text: streakText(streak) });
  }

  // A week where every day landed near the target. Today counts once its
  // total is in range, so it can show before the day is over.
  const onTarget = (day: DateKey) =>
    input.hasMeals(day) &&
    Math.abs(input.kcalOn(day) - input.targetKcal) <= input.targetKcal * ON_TARGET;
  const run = runEndingOn(input.date, onTarget);
  if (input.lastMealAt && run > 0 && run % 7 === 0) {
    found.push({
      id: `target:${run}`,
      at: input.lastMealAt,
      text:
        run === 7
          ? 'Your first full week on target: 7 days within 10% of your calories. That consistency is what moves the scale.'
          : `${run / 7} weeks in a row on target. That's real progress.`,
    });
  }

  // Every dose due today taken (a skip doesn't count).
  if (input.medicinesDue > 0 && input.dosesTaken.length === input.medicinesDue) {
    const at = input.dosesTaken.map(d => d.at).sort().at(-1)!;
    found.push({
      id: 'meds:all',
      at,
      text: input.medicinesDue === 1 ? "That's today's dose done." : `All ${input.medicinesDue} medicines taken today.`,
    });
  }
  return found;
}

// For Mira's opening line: the current run, or the one today would continue.
export function streakLine(today: DateKey, hasMeals: (day: DateKey) => boolean): string | undefined {
  const withToday = runEndingOn(today, hasMeals);
  if (withToday >= 2) return `Day ${withToday} in a row.`;
  const before = runEndingOn(addDays(today, -1), hasMeals);
  if (before >= 2) return `You've logged ${before} days in a row. Today makes ${before + 1}.`;
  return undefined;
}
