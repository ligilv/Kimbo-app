import { factOfTheDay, factsFor } from '@/features/today/facts';

const MEAT = /chicken|fish|mutton|meat/i;
const EGG = /\begg/i;
const DAIRY = /paneer|curd|milk|ghee|lassi|dahi/i;

test('a diet never gets foods it does not eat', () => {
  for (const goal of ['lose', 'maintain', 'gain'] as const) {
    expect(factsFor(goal, 'veg').filter(f => MEAT.test(f))).toEqual([]);
    expect(factsFor(goal, 'egg').filter(f => MEAT.test(f))).toEqual([]);
    expect(factsFor(goal, 'vegan').filter(f => MEAT.test(f) || EGG.test(f) || DAIRY.test(f))).toEqual([]);
    expect(factsFor(goal, 'vegan').length).toBeGreaterThan(10);
  }
});

test('goal-specific tips only go to that goal', () => {
  expect(factsFor('lose', 'nonveg').join(' ')).not.toMatch(/surplus|Gaining/);
  expect(factsFor('gain', 'nonveg').join(' ')).not.toMatch(/Half a kilo a week/);
});

test('same fact all day, a different one tomorrow', () => {
  expect(factOfTheDay('2026-10-10', 'lose', 'veg')).toBe(factOfTheDay('2026-10-10', 'lose', 'veg'));
  expect(factOfTheDay('2026-10-11', 'lose', 'veg')).not.toBe(factOfTheDay('2026-10-10', 'lose', 'veg'));
});
