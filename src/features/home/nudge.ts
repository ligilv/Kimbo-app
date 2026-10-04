import { defaultSlotFor } from '@/features/meals/dates';
import type { MealSlot, Nutrients } from '@/features/meals/types';
import { displayName } from '@/features/onboarding/script';
import type { Diet, Profile } from '@/features/onboarding/types';
import type { Targets } from '@/features/onboarding/targets';

export type Nudge = { text: string; slot?: MealSlot };

const PROTEIN_GAP_G = 15; // smaller gaps aren't worth a message
const EVENING_HOUR = 16;
const ON_TRACK = 0.9; // within 10% of the calorie target counts as on track

const PROTEIN_FOODS: Record<Diet, string> = {
  veg: 'Paneer or dal',
  egg: 'Eggs or paneer',
  nonveg: 'Chicken or eggs',
  vegan: 'Tofu or chana',
};

// One message for the day on screen, from simple rules (no AI call).
// Past days get a short recap, or nothing.
export function getNudge(
  totals: Nutrients,
  targets: Targets,
  now: Date,
  options: { isToday: boolean; diet: Diet },
): Nudge | null {
  const kcalLeft = Math.round(targets.calories - totals.kcal);
  const proteinGap = Math.round(targets.proteinG - totals.protein);

  if (!options.isToday) {
    if (totals.kcal === 0) return null;
    if (proteinGap <= 0) return { text: 'Protein target hit 💪' };
    if (Math.abs(kcalLeft) <= targets.calories * (1 - ON_TRACK)) {
      return { text: 'Right on your calorie target that day.' };
    }
    return null;
  }

  if (totals.kcal === 0) {
    const slot = defaultSlotFor(now);
    return { text: `Start with ${slot} — tap here to log it.`, slot };
  }

  if (totals.kcal > targets.calories * (2 - ON_TRACK)) {
    return {
      text: "You're a little over today, and that's okay. One day doesn't undo your week.",
    };
  }

  if (now.getHours() >= EVENING_HOUR && proteinGap >= PROTEIN_GAP_G) {
    return {
      text: `You're ${proteinGap}g short on protein. ${PROTEIN_FOODS[options.diet]} at dinner would close it.`,
      slot: 'dinner',
    };
  }

  if (totals.kcal >= targets.calories * ON_TRACK) {
    return { text: 'Nicely on track today.' };
  }

  return {
    text: `${kcalLeft.toLocaleString('en-IN')} kcal left today. Keep going!`,
    slot: defaultSlotFor(now),
  };
}

const GOAL_REASON: Record<Profile['goal'], (t: Targets) => string> = {
  lose: t => `to lose about ${t.kgPerWeek} kg a week`,
  maintain: () => 'to keep your weight steady',
  gain: t => `to gain about ${t.kgPerWeek} kg a week, mostly muscle`,
};

// Shown instead of the nudge until the very first meal is saved.
export function getWelcomePlan(profile: Profile, targets: Targets) {
  return {
    title: `Here's your plan, ${displayName(profile)}`,
    goal: `${targets.calories.toLocaleString('en-IN')} kcal and ${
      targets.proteinG
    }g protein a day`,
    reason: `Worked out from your height, weight and activity${
      targets.kgPerWeek > 0 || profile.goal === 'maintain'
        ? `, ${GOAL_REASON[profile.goal](targets)}`
        : ''
    }.`,
  };
}
