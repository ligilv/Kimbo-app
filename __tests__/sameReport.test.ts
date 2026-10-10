import { addReport, findSameReport, getFollowups, getReports, type Report } from '@/features/reports/reportStore';
import { storage } from '@/storage';

const value = (key: string, v: number) => ({ key, label: key, value: v, unit: 'x', status: 'normal' }) as never;
const saved: Report = { id: 'r1', takenOn: '2026-09-30', uploadedAt: '', values: [value('b12', 168), value('ldl', 142)] };

test('the same report uploaded again is recognised, a new one is not', () => {
  const again = { takenOn: '2026-09-30', values: [value('ldl', 142), value('b12', 168)] } as never;
  expect(findSameReport(again, [saved])?.id).toBe('r1');
  const retest = { takenOn: '2026-12-30', values: [value('b12', 300), value('ldl', 120)] } as never;
  expect(findSameReport(retest, [saved])).toBeUndefined();
});

describe('a different report', () => {
  const v = (key: string, status: string) => ({ key, label: key, value: 1, unit: 'x', status }) as never;
  const keys = () => getFollowups().map(f => f.key).sort();
  beforeEach(() => storage.clearAll());

  test('a re-test that is now normal stops the question; a new low value opens one', () => {
    addReport({ notAReport: false, takenOn: '2026-09-30', values: [v('b12', 'low'), v('ldl', 'high')] });
    expect(keys()).toEqual(['b12', 'ldl']);
    addReport({ notAReport: false, takenOn: '2026-12-30', values: [v('b12', 'normal'), v('ldl', 'high'), v('iron', 'low')] });
    expect(keys()).toEqual(['iron', 'ldl']); // b12 fine now; ldl not asked twice
    expect(getReports()).toHaveLength(2);
  });

  test('an older report uploaded later only joins the history', () => {
    addReport({ notAReport: false, takenOn: '2026-12-30', values: [v('b12', 'normal')] });
    addReport({ notAReport: false, takenOn: '2026-06-01', values: [v('b12', 'low')] });
    expect(keys()).toEqual([]);
    expect(getReports()).toHaveLength(2);
  });
});
