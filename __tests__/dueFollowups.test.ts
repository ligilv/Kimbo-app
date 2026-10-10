import { dueFollowups, type Followup } from '@/features/reports/reportStore';

const now = new Date(2026, 9, 10, 11, 0);
const open = (key: string): Followup => ({
  id: key,
  reportId: 'r',
  key,
  label: key,
  status: 'low',
  state: 'open',
  remindAt: new Date(2026, 9, 9).toISOString(),
});

test('one report question a day, so meals still get asked', () => {
  const list = [open('b12'), open('urea')];
  expect(dueFollowups(list, now).map(f => f.key)).toEqual(['b12', 'urea']);

  const answered = { ...list[0], state: 'treating' as const, answeredAt: new Date(2026, 9, 10, 9, 0).toISOString() };
  expect(dueFollowups([answered, list[1]], now)).toEqual([]); // already asked one today
  expect(dueFollowups([answered, list[1]], new Date(2026, 9, 11, 9, 0)).map(f => f.key)).toEqual(['urea']); // tomorrow
});
