import { adherence, getMedicines, recordDose, saveMedicine } from '@/features/medicines/medicineStore';
import { storage } from '@/storage';

test('editing a medicine replaces it in place and keeps its dose history', () => {
  storage.clearAll();
  const med = saveMedicine({ name: 'Iron', dose: '1 tablet', time: '09:00', frequency: 'daily', startDate: '2026-10-01', remind: true });
  recordDose('2026-10-05', med.id, 'taken');

  saveMedicine({ ...med, time: '21:30', dose: '2 tablets', remind: false });

  expect(getMedicines()).toHaveLength(1);
  expect(getMedicines()[0]).toMatchObject({ id: med.id, time: '21:30', dose: '2 tablets', remind: false, startDate: '2026-10-01' });
  expect(adherence(getMedicines()[0], ['2026-10-05'], '2026-10-10')).toEqual(['taken']);
});
