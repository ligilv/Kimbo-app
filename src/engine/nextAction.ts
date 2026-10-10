import type { MealSlot, Nutrients } from '@/features/meals/types';
import type { Diet } from '@/features/onboarding/types';
import { formatLate, formatTime, minutesOf, toMinutes } from './time';

// What Mira says next, and when. A pure function: no React, no storage, no
// clock of its own, so every state of the Today screen is a unit test.

export type Routine = {
  breakfast: string; // "08:30", local time
  lunch: string;
  dinner: string;
  snacks?: string; // optional; never nagged about
};

export type Intent =
  | { kind: 'snap'; slot: MealSlot }
  | { kind: 'say'; slot: MealSlot }
  | { kind: 'skip_meal'; slot: MealSlot }
  | { kind: 'med_taken'; id: string }
  | { kind: 'med_skip'; id: string }
  | { kind: 'snooze'; key: string; minutes: number }
  | { kind: 'followup'; id: string; answer: 'prescribed' | 'taking' | 'not_yet' }
  | { kind: 'dismiss'; key: string };

export type Chip = { label: string; intent: Intent };

export type NextAction = {
  id: string; // stable per item, e.g. "meal:breakfast", "med:abc"
  type:
    | 'log_meal'
    | 'take_medicine'
    | 'report_followup'
    | 'nutrition_nudge'
    | 'all_done';
  urgency: 'normal' | 'soon' | 'overdue';
  title: string;
  body?: string;
  primary?: Chip;
  secondary?: Chip;
  dismiss?: Chip;
  slot?: MealSlot;
};

export type EngineMedicine = {
  id: string;
  name: string;
  dose: string;
  time: string; // "HH:MM"
  handled: boolean; // taken or skipped today
};

export type EngineFollowup = {
  id: string;
  label: string; // "Vitamin D"
  status: 'low' | 'high';
};

export type EngineContext = {
  now: Date;
  routine: Routine;
  loggedSlots: MealSlot[]; // slots with at least one meal today
  medicines: EngineMedicine[]; // only the ones due today
  openFollowups: EngineFollowup[]; // open and due to be asked
  dismissed: string[]; // e.g. "meal:breakfast" (skipped), "nudge:protein"
  snoozedUntil: Record<string, string>; // id -> ISO time
  targets: { calories: number; proteinG: number };
  totals: Nutrients;
  diet: Diet;
  firstTime: boolean; // nothing ever logged
};

const OPEN_BEFORE = 30; // a meal window opens 30 min before the usual time
const LATE_AFTER = 60; // and is late an hour after it
const MED_WINDOW = 30;
const NUDGE_HOUR = 18;
const PROTEIN_SHARE = 0.6;

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
const SLOT_NAME: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snack',
  dinner: 'Dinner',
};

export const PROTEIN_FOODS: Record<Diet, string> = {
  veg: 'paneer, dal or curd',
  egg: 'eggs, paneer or dal',
  nonveg: 'chicken, eggs or fish',
  vegan: 'tofu, chana or soya',
};

const mealChips = (slot: MealSlot) => ({
  primary: { label: 'Snap it', intent: { kind: 'snap', slot } } as Chip,
  secondary: { label: 'Say it', intent: { kind: 'say', slot } } as Chip,
  dismiss: { label: 'Skip', intent: { kind: 'skip_meal', slot } } as Chip,
});

const medChips = (id: string) => ({
  primary: { label: 'Taken', intent: { kind: 'med_taken', id } } as Chip,
  secondary: {
    label: 'Snooze 30 min',
    intent: { kind: 'snooze', key: `med:${id}`, minutes: 30 },
  } as Chip,
  dismiss: { label: 'Skip', intent: { kind: 'med_skip', id } } as Chip,
});

type Window = { slot: MealSlot; at: number; start: number; late: number; end: number };

// Each meal's window runs until the next meal's opens, so a missed breakfast
// stops nagging once lunch time comes round.
function mealWindows(routine: Routine): Window[] {
  const slots = SLOT_ORDER.filter(s => routine[s] !== undefined);
  return slots.map((slot, i) => {
    const at = toMinutes(routine[slot]!);
    const next = slots[i + 1];
    const late = at + LATE_AFTER;
    return {
      slot,
      at,
      start: at - OPEN_BEFORE,
      late,
      // Snacks are optional: the window just closes, it's never "late".
      end:
        slot === 'snacks'
          ? late
          : next
          ? toMinutes(routine[next]!) - OPEN_BEFORE
          : 24 * 60,
    };
  });
}

// The meal someone logging "now" most likely means: the one whose usual time is closest.
// Meals that can be logged so far today: dinner isn't offered at 11 am, but an
// early dinner (2 h before the usual time) is. Snacks fit any time; the first
// meal is always there, even at 6 am.
const OFFER_BEFORE = 120;
export function slotsSoFar(routine: Routine, now: Date): MealSlot[] {
  const t = minutesOf(now);
  return SLOT_ORDER.filter(
    (s, i) => i === 0 || s === 'snacks' || routine[s] === undefined || toMinutes(routine[s]!) - OFFER_BEFORE <= t,
  );
}

export function nearestSlot(routine: Routine, now: Date): MealSlot {
  const t = minutesOf(now);
  // Closest of the meals that have come round (11:30 am is still breakfast, not lunch).
  return slotsSoFar(routine, now).filter(s => routine[s] !== undefined).reduce((best, s) =>
    Math.abs(toMinutes(routine[s]!) - t) < Math.abs(toMinutes(routine[best]!) - t) ? s : best,
  'breakfast' as MealSlot);
}

// The report question and its answers: asked in the Today chat, and from a
// tap on a flagged value in Health.
export const followupQuestion = (label: string, status: 'low' | 'high') =>
  `Your ${label} is ${status}. Have you seen a doctor about it?`;
export const FOLLOWUP_CHOICES = {
  prescribed: 'Yes, got a prescription',
  taking: 'Already taking something',
  not_yet: 'Not yet',
} as const;

export function nextAction(ctx: EngineContext): NextAction {
  const now = minutesOf(ctx.now);
  const snoozed = (id: string) => {
    const until = ctx.snoozedUntil[id];
    return until !== undefined && new Date(until) > ctx.now;
  };
  const meds = ctx.medicines
    .filter(m => !m.handled && !snoozed(`med:${m.id}`))
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const windows = mealWindows(ctx.routine).filter(
    w =>
      !ctx.loggedSlots.includes(w.slot) &&
      !ctx.dismissed.includes(`meal:${w.slot}`) &&
      !snoozed(`meal:${w.slot}`),
  );

  // 1. A medicine more than 30 min past its time.
  const overdueMed = meds.find(m => now > toMinutes(m.time) + MED_WINDOW);
  if (overdueMed) {
    return {
      id: `med:${overdueMed.id}`,
      type: 'take_medicine',
      urgency: 'overdue',
      title: `${overdueMed.name}, ${overdueMed.dose}`,
      body: `It was due at ${formatTime(overdueMed.time)}. Have you taken it?`,
      ...medChips(overdueMed.id),
    };
  }

  // 2. A report value that needs a decision.
  const followup = ctx.openFollowups.find(f => !snoozed(`followup:${f.id}`));
  if (followup) {
    return {
      id: `followup:${followup.id}`,
      type: 'report_followup',
      urgency: 'normal',
      title: followupQuestion(followup.label, followup.status),
      primary: {
        label: FOLLOWUP_CHOICES.prescribed,
        intent: { kind: 'followup', id: followup.id, answer: 'prescribed' },
      },
      secondary: {
        label: FOLLOWUP_CHOICES.taking,
        intent: { kind: 'followup', id: followup.id, answer: 'taking' },
      },
      dismiss: {
        label: FOLLOWUP_CHOICES.not_yet,
        intent: { kind: 'followup', id: followup.id, answer: 'not_yet' },
      },
    };
  }

  // An earlier meal today with no log and no skip ("Breakfast wasn't logged").
  // Said alongside the current meal; saying "breakfast was poha" files it there.
  const missed = ctx.firstTime ? [] : windows.filter(w => w.slot !== 'snacks' && w.end <= now);
  const missedNote = missed.length
    ? ` No ${missed.map(w => SLOT_NAME[w.slot].toLowerCase()).join(' or ')} logged today. Had it? Tell me, like "${missed[0].slot} was poha".`
    : '';

  // 3. A meal whose time has passed without a log or a skip.
  // (Not for a brand-new user: "late" means nothing before they have a habit.)
  const late = ctx.firstTime
    ? undefined
    : windows.find(w => now >= w.late && now < w.end);
  if (late) {
    return {
      id: `meal:${late.slot}`,
      type: 'log_meal',
      urgency: 'overdue',
      slot: late.slot,
      title: `${SLOT_NAME[late.slot]} · ${formatLate(now - late.at)} late`,
      body: `Did you eat? Snap it or tell me. If you skipped it, that's fine too.${missedNote}`,
      ...mealChips(late.slot),
    };
  }

  // 4. A meal that's about now.
  const open = windows.find(w => now >= w.start && now < w.late && now < w.end);
  if (open) {
    return {
      id: `meal:${open.slot}`,
      type: 'log_meal',
      urgency: 'normal',
      slot: open.slot,
      title: ctx.firstTime
        ? `Let's log your first meal. What's for ${SLOT_NAME[open.slot].toLowerCase()}?`
        : `${SLOT_NAME[open.slot]} time. What are you having?`,
      body: ctx.firstTime
        ? 'Snap your plate or just tell me. Nothing is saved until you check it.'
        : `You usually eat around ${formatTime(ctx.routine[open.slot]!)}.${missedNote}`,
      ...mealChips(open.slot),
    };
  }

  // 5. A medicine due in the next half hour (or just now).
  const soonMed = meds.find(
    m => Math.abs(now - toMinutes(m.time)) <= MED_WINDOW,
  );
  if (soonMed) {
    return {
      id: `med:${soonMed.id}`,
      type: 'take_medicine',
      urgency: 'soon',
      title: `${soonMed.name}, ${soonMed.dose}`,
      body: `Due at ${formatTime(soonMed.time)}.`,
      ...medChips(soonMed.id),
    };
  }

  // A new user between meal times still gets one clear thing to do.
  if (ctx.firstTime) {
    const slot = windows.find(w => now < w.end)?.slot ?? 'snacks';
    return {
      id: `meal:${slot}`,
      type: 'log_meal',
      urgency: 'normal',
      slot,
      title: "Let's log your first meal",
      body: 'Snap your plate or just tell me what you ate. Nothing is saved until you check it.',
      ...mealChips(slot),
    };
  }

  // 6. Evening and well short on protein.
  const proteinShort =
    ctx.totals.kcal > 0 &&
    ctx.totals.protein < ctx.targets.proteinG * PROTEIN_SHARE;
  if (
    ctx.now.getHours() >= NUDGE_HOUR &&
    proteinShort &&
    !ctx.dismissed.includes('nudge:protein')
  ) {
    const gap = Math.round(ctx.targets.proteinG - ctx.totals.protein);
    return {
      id: 'nudge:protein',
      type: 'nutrition_nudge',
      urgency: 'normal',
      title: `You're ${gap} g short on protein today.`,
      body: `Some ${PROTEIN_FOODS[ctx.diet]} ${
        ctx.loggedSlots.includes('dinner') ? 'later tonight' : 'at dinner'
      } would close most of it.`,
      primary: {
        label: 'Got it',
        intent: { kind: 'dismiss', key: 'nudge:protein' },
      },
    };
  }

  // 7. Nothing to do right now: say what's next.
  const nextMeal = windows.find(w => now < w.start && w.slot !== 'snacks');
  const nextMed = meds.find(m => toMinutes(m.time) > now);
  const nextUp = [
    nextMeal && {
      at: nextMeal.at,
      text: `That's it till ${SLOT_NAME[nextMeal.slot].toLowerCase()}. I'll check in around ${formatTime(ctx.routine[nextMeal.slot]!)}.`,
    },
    nextMed && {
      at: toMinutes(nextMed.time),
      text: `That's it till your ${nextMed.name} at ${formatTime(nextMed.time)}.`,
    },
  ]
    .filter((x): x is { at: number; text: string } => !!x)
    .sort((a, b) => a.at - b.at)[0];

  if (nextUp) {
    return {
      id: 'done:later',
      type: 'all_done',
      urgency: 'normal',
      title: nextUp.text,
    };
  }
  const onTarget =
    Math.abs(ctx.totals.kcal - ctx.targets.calories) <=
    ctx.targets.calories * 0.1;
  return {
    id: 'done:day',
    type: 'all_done',
    urgency: 'normal',
    title: onTarget ? "You're on track today." : "That's today done.",
    body: `Tomorrow: breakfast around ${formatTime(ctx.routine.breakfast)}.`,
  };
}
