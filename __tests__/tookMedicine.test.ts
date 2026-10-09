import type { Medicine } from '@/features/medicines/medicineStore';
import { tookMedicine } from '@/features/medicines/tookMedicine';

const med = (name: string): Medicine => ({
  id: name,
  name,
  dose: '1',
  time: '21:00',
  frequency: 'daily',
  startDate: '2026-10-01',
  remind: true,
});

test('matches a named or generic medicine, never food', () => {
  const pending = [med('Vitamin D3'), med('Iron')];
  expect(tookMedicine('took my vitamin d', pending)?.name).toBe('Vitamin D3');
  expect(tookMedicine('had my iron tablet', pending)?.name).toBe('Iron');
  expect(tookMedicine('took my meds', pending)?.name).toBe('Vitamin D3');
  expect(tookMedicine('had 2 rotis and dal', pending)).toBeUndefined();
  expect(tookMedicine('took my medicine', [])).toBeUndefined();
});
