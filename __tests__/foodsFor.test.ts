import { foodsFor } from '@/features/reports/WhyItMattersSheet';
import type { ReportValue } from '@/features/reports/schema';

const b12 = {
  foods: { veg: ['Curd', 'Milk', 'Paneer'], nonveg: ['Eggs', 'Chicken', 'Fish'] },
} as ReportValue;

test('foods respect the diet: no meat or fish for vegetarians or eggetarians', () => {
  expect(foodsFor(b12, 'veg')).toEqual(['Curd', 'Milk', 'Paneer']);
  expect(foodsFor(b12, 'egg')).toEqual(['Eggs', 'Curd', 'Milk', 'Paneer']);
  expect(foodsFor(b12, 'nonveg')).toContain('Chicken');
});
