import type { Mood } from '@/components/Mascot';
import { type NextAction, PROTEIN_FOODS } from '@/engine/nextAction';
import { formatTime, minutesOf, toMinutes } from '@/engine/time';
import type { DayState } from '@/features/day/dayState';
import { type DateKey, formatShortDate, toLocalDateKey } from '@/features/meals/dates';
import { formatKcal, SLOT_LABEL } from '@/features/meals/format';
import { sumNutrients } from '@/features/meals/mealStore';
import type { MealLog, MealSlot, Nutrients } from '@/features/meals/types';
import type { Dose, Medicine } from '@/features/medicines/medicineStore';
import type { Diet, MealTimes } from '@/features/onboarding/types';
import type { Followup } from '@/features/reports/reportStore';
import type { Milestone } from './milestones';

// Today is one conversation per day. It isn't stored as a chat: it's rebuilt
// from what happened (meals, doses, skips, answers) plus what Mira says next,
// so editing a meal or loading another day can never leave a stale message.

export type FeedItem =
  | { kind: 'mira'; id: string; text: string; action?: NextAction; mood?: Mood }
  | { kind: 'meal'; id: string; log: MealLog }
  | { kind: 'reply'; id: string; text: string };

export type FeedInput = {
  date: DateKey;
  isToday: boolean;
  now: Date;
  name: string;
  diet: Diet;
  logs: MealLog[];
  day: DayState;
  medicines: Medicine[]; // due on this date
  doses: Record<string, Dose>;
  followups: Followup[];
  flaggedSummary?: string; // "3 of 24 values need attention"
  streakLine?: string; // "Day 4 in a row."
  milestones?: Milestone[]; // placed at the moment they were earned
  proteinTarget: number;
  action?: NextAction; // today only
};

const ANSWER_TEXT: Record<NonNullable<Followup['answer']>, string> = {
  prescribed: 'Yes, got a prescription',
  taking: 'Already taking something',
  not_yet: 'Not yet',
};

const SKIP_TEXT = (key: string) => {
  const [kind, what] = key.split(':');
  if (kind === 'meal') return `Skipped ${SLOT_LABEL[what as MealSlot].toLowerCase()}`;
  return null; // dismissed nudges need no reply bubble
};

// Short on purpose: the day's schedule lives in the quiet "Later today" line.
function greeting(now: Date, name: string) {
  const h = now.getHours();
  const part = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
  return `${part}, ${name}.`;
}

const NEXT_MEAL: Record<MealSlot, string> = {
  breakfast: 'at lunch',
  lunch: 'at dinner',
  snacks: 'at dinner',
  dinner: 'later tonight',
};

export function mealSummary(log: MealLog) {
  const names = log.items.map(i => i.name.toLowerCase());
  const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} · ${formatKcal(sumNutrients(log.items).kcal)}`;
}

// One line after a meal: what it added, what's left, and one food that closes
// the gap (a number with no "then what" is just a log).
export function mealReaction(
  meal: Nutrients,
  soFarProtein: number, // including this meal
  proteinTarget: number,
  slot: MealSlot,
  diet: Diet,
) {
  const added = `${formatKcal(meal.kcal)}, ${Math.round(meal.protein)} g protein.`;
  const left = Math.round(proteinTarget - soFarProtein);
  if (left <= 5) return `${added} That covers today's protein. Nicely done.`;
  return `${added} About ${left} g protein to go today: ${PROTEIN_FOODS[diet]} ${NEXT_MEAL[slot]} would help.`;
}

export function buildFeed(input: FeedInput): FeedItem[] {
  const items: FeedItem[] = [];
  const intro = input.isToday
    ? [greeting(input.now, input.name), input.streakLine].filter((line): line is string => !!line)
    : [`Here's ${formatShortDate(input.date)}.`];
  if (input.isToday && input.flaggedSummary)
    intro.push(`I've read your report: ${input.flaggedSummary}.`);
  items.push({ kind: 'mira', id: 'intro', text: intro.join(' ') });

  type Event = { at: string; items: FeedItem[] };
  const events: Event[] = [];

  let soFar = 0;
  for (const log of [...input.logs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const meal = sumNutrients(log.items);
    soFar += meal.protein;
    events.push({
      at: log.createdAt,
      items: [
        { kind: 'meal', id: `meal:${log.id}`, log },
        {
          kind: 'mira',
          id: `react:${log.id}`,
          text: mealReaction(meal, soFar, input.proteinTarget, log.slot, input.diet),
        },
      ],
    });
  }
  for (const [key, at] of Object.entries(input.day.handled)) {
    const text = SKIP_TEXT(key);
    if (text) events.push({ at, items: [{ kind: 'reply', id: `skip:${key}`, text }] });
  }
  for (const med of input.medicines) {
    const dose = input.doses[med.id];
    if (dose)
      events.push({
        at: dose.at,
        items: [
          {
            kind: 'reply',
            id: `dose:${med.id}`,
            text: `${dose.status === 'taken' ? 'Took' : 'Skipped'} ${med.name}`,
          },
        ],
      });
  }
  for (const f of input.followups) {
    if (f.answer && f.answeredAt && toLocalDateKey(new Date(f.answeredAt)) === input.date)
      // The question stays above its answer, so the reply never floats alone.
      events.push({
        at: f.answeredAt,
        items: [
          { kind: 'mira', id: `fuq:${f.id}`, text: `Your ${f.label} is ${f.status}. Have you seen a doctor about it?` },
          { kind: 'reply', id: `fu:${f.id}`, text: ANSWER_TEXT[f.answer] },
        ],
      });
  }

  // Pushed last so a milestone earned with a meal lands just after that meal.
  for (const m of input.milestones ?? []) {
    events.push({ at: m.at, items: [{ kind: 'mira', id: m.id, text: m.text, mood: 'grin' }] });
  }

  events.sort((a, b) => a.at.localeCompare(b.at)).forEach(e => items.push(...e.items));

  if (input.action) {
    items.push({
      kind: 'mira',
      id: `next:${input.action.id}`,
      text: [input.action.title, input.action.body].filter(Boolean).join('\n'),
      action: input.action,
    });
  }
  return items;
}

// The rest of today, quietly, under Mira's latest message: proof she knows the
// schedule, without a six-line greeting. What's happening now is left out.
export function laterToday(input: {
  now: Date;
  mealTimes: MealTimes;
  loggedSlots: MealSlot[];
  handled: string[];
  medicines: Medicine[];
  doses: Record<string, Dose>;
  actionId?: string;
}): string[] {
  const now = minutesOf(input.now);
  const meals = (['breakfast', 'lunch', 'snacks', 'dinner'] as MealSlot[])
    .filter(slot => input.mealTimes[slot] !== undefined)
    .filter(slot => !input.loggedSlots.includes(slot) && !input.handled.includes(`meal:${slot}`))
    .filter(slot => `meal:${slot}` !== input.actionId && toMinutes(input.mealTimes[slot]!) > now)
    .map(slot => ({ at: toMinutes(input.mealTimes[slot]!), text: `${SLOT_LABEL[slot]} around ${formatTime(input.mealTimes[slot]!)}` }));
  const meds = input.medicines
    .filter(m => !input.doses[m.id] && `med:${m.id}` !== input.actionId && toMinutes(m.time) > now)
    .map(m => ({ at: toMinutes(m.time), text: `${m.name} at ${formatTime(m.time)}` }));
  return [...meals, ...meds].sort((a, b) => a.at - b.at).map(x => x.text);
}
