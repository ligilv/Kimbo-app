import {
  addWater,
  formatWater,
  getWater,
  waterTargetMl,
} from '@/features/water/water';
import { storage } from '@/storage';

beforeEach(() => storage.clearAll());

test('target is ~35 ml per kg in whole glasses, within 6–16 glasses', () => {
  expect(waterTargetMl(59)).toBe(2000); // 2065 ml -> 8 glasses
  expect(waterTargetMl(30)).toBe(1500); // floor of 6 glasses
  expect(waterTargetMl(200)).toBe(4000); // cap of 16 glasses
});

test('adding and removing never goes below zero', () => {
  addWater('2026-10-04', 250);
  addWater('2026-10-04', 500);
  expect(getWater('2026-10-04')).toBe(750);
  addWater('2026-10-04', -1000);
  expect(getWater('2026-10-04')).toBe(0);
  expect(getWater('2026-10-03')).toBe(0);
});

test('shows glasses or litres', () => {
  expect(formatWater(1250, 'glass')).toBe('5 glasses');
  expect(formatWater(250, 'glass')).toBe('1 glass');
  expect(formatWater(1250, 'l')).toBe('1.3 L');
  expect(formatWater(2000, 'l')).toBe('2 L');
});
