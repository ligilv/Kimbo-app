import {
  addDays,
  defaultSlotFor,
  formatDayLabel,
  getWeekDays,
  toLocalDateKey,
} from '@/features/meals/dates';

test('date keys use the local day, even when UTC is on a different day', () => {
  // 20:00 UTC on 3 Oct is 01:30 on 4 Oct in India.
  expect(toLocalDateKey(new Date('2026-10-03T20:00:00Z'))).toBe('2026-10-04');
  // 23:59 and 00:01 local fall either side of midnight.
  expect(toLocalDateKey(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
  expect(toLocalDateKey(new Date(2026, 9, 4, 0, 1))).toBe('2026-10-04');
});

test('adding days crosses months and years', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
});

test('weeks start on Monday', () => {
  // 3 Oct 2026 is a Saturday.
  expect(getWeekDays('2026-10-03')).toEqual([
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
  ]);
  // A Sunday belongs to the week that started the Monday before.
  expect(getWeekDays('2026-10-04')[0]).toBe('2026-09-28');
});

test('friendly labels', () => {
  const now = new Date(2026, 9, 3, 9, 0);
  expect(formatDayLabel('2026-10-03', now)).toBe('Today');
  expect(formatDayLabel('2026-10-02', now)).toBe('Yesterday');
  expect(formatDayLabel('2026-09-30', now)).toBe('Wed, 30 Sep');
});

test('default meal slot follows the time of day', () => {
  const at = (h: number, m = 0) => defaultSlotFor(new Date(2026, 9, 3, h, m));
  expect(at(7)).toBe('breakfast');
  expect(at(10, 59)).toBe('breakfast');
  expect(at(11)).toBe('lunch');
  expect(at(16)).toBe('snacks');
  expect(at(19)).toBe('dinner');
  expect(at(23, 59)).toBe('dinner');
});
