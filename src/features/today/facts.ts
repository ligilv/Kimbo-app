import type { DateKey } from '@/features/meals/dates';
import type { Diet, Goal } from '@/features/onboarding/types';

// One line from Mira under the greeting, the same all day, a new one tomorrow.
// Practical and in Indian portions; numbers are rounded, typical values.
// `has` marks foods some diets don't eat, so a vegetarian never gets chicken.
type Fact = { text: string; goals?: Goal[]; has?: 'meat' | 'egg' | 'dairy' };

const FACTS: Fact[] = [
  // Any goal
  { text: 'Protein at breakfast keeps you fuller till lunch.' },
  { text: 'Two rotis are about the same as one katori of rice: roughly 200 kcal.' },
  { text: 'A spoon of oil is about 120 kcal. The tadka counts too.' },
  { text: 'A katori of dal has about 7 g protein. Thicker dal, a bit more.' },
  { text: 'Whole fruit beats juice: the fibre keeps you full, the juice just goes down.' },
  { text: 'Your weight can swing 1 to 2 kg in a day from water and salt. Watch the weekly trend.' },
  { text: 'A plate that\'s half sabzi fills you up for far fewer calories.' },
  { text: 'Short sleep makes you hungrier the next day. Bedtime counts as a health habit.' },
  { text: 'It takes about 20 minutes to feel full. Eating a little slower helps.' },
  { text: 'A katori of chana or rajma has around 10 g protein and plenty of fibre.' },
  { text: 'A handful of peanuts is about 170 kcal and 7 g protein.' },
  { text: 'A katori of curd has about 5 g protein. Hung curd has roughly double.', has: 'dairy' },
  { text: '100 g of paneer has about 18 g protein, the same as three eggs.', has: 'dairy' },
  { text: 'One egg has about 6 g protein for around 75 kcal.', has: 'egg' },
  { text: '100 g of cooked chicken breast has about 30 g protein.', has: 'meat' },
  { text: '100 g of soya chunks (dry) has about 50 g protein, one of the richest veg sources.' },
  { text: 'Tofu has about 10 g protein per 100 g and soaks up any masala.' },

  // Losing weight
  { text: 'A katori of dal or salad before rice fills you up for about 100 kcal.', goals: ['lose'] },
  { text: 'Two spoons of sugar in chai add about 35 kcal a cup. Three cups a day adds up.', goals: ['lose'] },
  { text: 'A samosa is around 250 kcal, about the same as a full roti-sabzi meal.', goals: ['lose'] },
  { text: 'Roasted chana instead of fried namkeen: more protein, about half the fat.', goals: ['lose'] },
  { text: 'Half a kilo a week is a pace you can keep. Faster usually comes back.', goals: ['lose'] },
  { text: 'Hitting your protein while eating less helps you keep muscle and lose fat.', goals: ['lose'] },
  { text: 'Drinks count: a can of cola or a glass of sweetened juice is around 150 kcal.', goals: ['lose', 'maintain'] },

  // Gaining
  { text: 'A banana and a glass of milk is an easy 250 kcal between meals.', goals: ['gain'], has: 'dairy' },
  { text: 'A spoon of peanut butter is about 95 kcal. Easy extra on a roti or toast.', goals: ['gain'] },
  { text: 'Gaining is easier with a snack between meals than with bigger meals.', goals: ['gain'] },
  { text: 'Spread protein over every meal: muscle builds better that way than in one go.', goals: ['gain'] },
  { text: 'Strength training plus a small calorie surplus builds muscle instead of just fat.', goals: ['gain'] },
  { text: 'A spoon of ghee on dal adds about 110 kcal without making the plate bigger.', goals: ['gain'], has: 'dairy' },
  { text: 'A handful of nuts is a quick 150 to 200 kcal.', goals: ['gain'] },

  // Keeping steady
  { text: 'Keeping steady is about the week, not the day. One big dinner won\'t undo it.', goals: ['maintain'] },
  { text: 'Weighing yourself once a week at the same time tells you more than daily.', goals: ['maintain', 'lose'] },
];

const SKIPS: Record<Diet, Fact['has'][]> = {
  nonveg: [],
  egg: ['meat'],
  veg: ['meat', 'egg'],
  vegan: ['meat', 'egg', 'dairy'],
};

export function factsFor(goal: Goal, diet: Diet): string[] {
  return FACTS.filter(f => (!f.goals || f.goals.includes(goal)) && !SKIPS[diet].includes(f.has)).map(f => f.text);
}

// Same fact all day; walks through the list a day at a time.
export function factOfTheDay(date: DateKey, goal: Goal, diet: Diet): string {
  const list = factsFor(goal, diet);
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return list[day % list.length];
}
