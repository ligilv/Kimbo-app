import type { NextAction } from '@/engine/nextAction';
import { formatTime } from '@/engine/time';
import type { DayState } from '@/features/day/dayState';
import { type DateKey, formatShortDate, toLocalDateKey } from '@/features/meals/dates';
import { formatKcal, SLOT_LABEL } from '@/features/meals/format';
import { sumNutrients } from '@/features/meals/mealStore';
import type { MealLog, MealSlot, Nutrients } from '@/features/meals/types';
import type { Dose, Medicine } from '@/features/medicines/medicineStore';
import type { MealTimes } from '@/features/onboarding/types';
import type { Followup } from '@/features/reports/reportStore';

// Today is one conversation per day. It isn't stored as a chat: it's rebuilt
// from what happened (meals, doses, skips, answers) plus what Mira says next,
// so editing a meal or loading another day can never leave a stale message.

export type FeedItem =
  | { kind: 'mira'; id: string; text: string; action?: NextAction }
  | { kind: 'meal'; id: string; log: MealLog }
  | { kind: 'reply'; id: string; text: string };

export type FeedInput = {
  date: DateKey;
  isToday: boolean;
  now: Date;
  name: string;
  mealTimes: MealTimes;
  logs: MealLog[];
  day: DayState;
  medicines: Medicine[]; // due on this date
  doses: Record<string, Dose>;
  followups: Followup[];
  flaggedSummary?: string; // "3 of 24 values need attention"
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

function greeting(now: Date, name: string) {
  const h = now.getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}.`;
}

function dayPlan(times: MealTimes, medicines: Medicine[]) {
  const meals = [
    `breakfast ~${formatTime(times.breakfast)}`,
    `lunch ~${formatTime(times.lunch)}`,
    `dinner ~${formatTime(times.dinner)}`,
  ];
  const meds = medicines.map(m => `${m.name} at ${formatTime(m.time)}`);
  return `Today: ${[...meals, ...meds].join(', ')}.`;
}

const share = (part: number, whole: number) => {
  const r = whole > 0 ? part / whole : 0;
  if (r < 0.15) return 'a small part';
  if (r < 0.3) return 'about a quarter';
  if (r < 0.45) return 'about a third';
  if (r < 0.65) return 'about half';
  return 'most';
};

export function mealSummary(log: MealLog) {
  const names = log.items.map(i => i.name.toLowerCase());
  const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} · ${formatKcal(sumNutrients(log.items).kcal)}`;
}

// One line after a meal: what it added, in words, against the day.
export function mealReaction(meal: Nutrients, proteinTarget: number) {
  const protein = Math.round(meal.protein);
  return `${formatKcal(meal.kcal)}, ${protein} g protein. That's ${share(protein, proteinTarget)} of today's protein.`;
}

export function buildFeed(input: FeedInput): FeedItem[] {
  const items: FeedItem[] = [];
  const intro = input.isToday
    ? [greeting(input.now, input.name), dayPlan(input.mealTimes, input.medicines)]
    : [`Here's ${formatShortDate(input.date)}.`];
  if (input.isToday && input.flaggedSummary) intro.push(`From your report: ${input.flaggedSummary}.`);
  items.push({ kind: 'mira', id: 'intro', text: intro.join(' ') });

  type Event = { at: string; items: FeedItem[] };
  const events: Event[] = [];

  for (const log of input.logs) {
    events.push({
      at: log.createdAt,
      items: [
        { kind: 'meal', id: `meal:${log.id}`, log },
        {
          kind: 'mira',
          id: `react:${log.id}`,
          text: mealReaction(sumNutrients(log.items), input.proteinTarget),
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
      events.push({ at: f.answeredAt, items: [{ kind: 'reply', id: `fu:${f.id}`, text: ANSWER_TEXT[f.answer] }] });
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
